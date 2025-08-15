"""
Advanced POD Integration Service
Enhanced print-on-demand with inventory tracking, bulk processing, and multi-provider support
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import json
import asyncio
import os
from enum import Enum

import aiohttp
from fastapi import HTTPException, status
from supabase import create_client, Client
from models.pod import (
    Product, ProductVariant, Order, OrderItem, OrderStatus, 
    Inventory, PODProvider, BulkOrder, PODWebhook
)
from models.common import SecurityContext, Money, Address
from .caching import CachingService
from .webhook import WebhookService

class PODAdvancedService:
    """Advanced POD service with multi-provider support and inventory management"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.cache = CachingService()
        self.webhook_service = WebhookService()
        
        # Provider configurations
        self.providers = {
            PODProvider.PRINTFUL: {
                "api_url": "https://api.printful.com",
                "auth_header": "Authorization",
                "auth_value": f"Bearer {os.getenv('PRINTFUL_API_KEY')}",
                "rate_limit": 120  # requests per minute
            },
            PODProvider.PRINTIFY: {
                "api_url": "https://api.printify.com/v1",
                "auth_header": "Authorization", 
                "auth_value": f"Bearer {os.getenv('PRINTIFY_API_TOKEN')}",
                "rate_limit": 60
            },
            PODProvider.GOOTEN: {
                "api_url": "https://api.gooten.com",
                "auth_header": "X-API-Key",
                "auth_value": os.getenv('GOOTEN_API_KEY'),
                "rate_limit": 100
            }
        }
        
        # Order processing queues
        self.order_queue = asyncio.Queue(maxsize=1000)
        self.bulk_queue = asyncio.Queue(maxsize=100)
        self.inventory_queue = asyncio.Queue(maxsize=5000)
        
        # Start background workers
        self._start_workers()
    
    def _start_workers(self):
        """Start background processing workers"""
        # Order processing workers
        for _ in range(5):
            asyncio.create_task(self._order_worker())
        
        # Bulk processing worker
        asyncio.create_task(self._bulk_worker())
        
        # Inventory sync workers
        for _ in range(3):
            asyncio.create_task(self._inventory_worker())
        
        # Periodic tasks
        asyncio.create_task(self._inventory_sync_scheduler())
        asyncio.create_task(self._order_status_checker())
    
    async def create_order(
        self,
        order_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> Order:
        """Create new POD order with multi-provider routing"""
        try:
            order = Order(
                id=uuid4(),
                user_id=user_context.user_id,
                order_number=self._generate_order_number(),
                items=[OrderItem(**item) for item in order_data["items"]],
                status=OrderStatus.PENDING,
                customer_email=order_data["customer_email"],
                shipping_address=Address(**order_data["shipping_address"]),
                created_at=datetime.utcnow()
            )
            
            # Calculate totals
            await self._calculate_order_totals(order)
            
            # Route items to optimal providers
            await self._route_order_items(order)
            
            # Store in database
            result = self.supabase.table("orders")\
                .insert(order.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create order"
                )
            
            # Queue for processing
            await self.order_queue.put(order)
            
            # Cache order for quick access
            await self.cache.set(f"order:{order.id}", order.dict(), ttl=86400)
            
            return order
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create order: {str(e)}"
            )
    
    async def create_bulk_order(
        self,
        bulk_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> BulkOrder:
        """Create bulk order for batch processing"""
        try:
            bulk_order = BulkOrder(
                id=uuid4(),
                user_id=user_context.user_id,
                name=bulk_data["name"],
                description=bulk_data.get("description"),
                order_items=bulk_data["items"],
                total_items=len(bulk_data["items"]),
                status="pending",
                created_at=datetime.utcnow()
            )
            
            # Calculate estimated cost
            bulk_order.estimated_total = await self._estimate_bulk_cost(bulk_order.order_items)
            
            # Store in database
            result = self.supabase.table("bulk_orders")\
                .insert(bulk_order.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create bulk order"
                )
            
            # Queue for processing
            await self.bulk_queue.put(bulk_order)
            
            return bulk_order
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create bulk order: {str(e)}"
            )
    
    async def get_order_status(
        self,
        order_id: UUID,
        user_context: SecurityContext
    ) -> Order:
        """Get detailed order status with tracking info"""
        try:
            # Check cache first
            cached = await self.cache.get(f"order:{order_id}")
            if cached:
                order = Order(**cached)
            else:
                # Query database
                result = self.supabase.table("orders")\
                    .select("*")\
                    .eq("id", str(order_id))\
                    .execute()
                
                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Order not found"
                    )
                
                order = Order(**result.data[0])
            
            # Verify user owns order
            if order.user_id != user_context.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            
            # Get latest tracking info if shipped
            if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                await self._update_tracking_info(order)
            
            return order
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get order status: {str(e)}"
            )
    
    async def sync_inventory(
        self,
        product_id: Optional[UUID] = None,
        provider: Optional[PODProvider] = None
    ) -> Dict[str, Any]:
        """Sync inventory data from POD providers"""
        try:
            sync_results = {
                "total_products": 0,
                "updated_products": 0,
                "errors": []
            }
            
            # Get products to sync
            if product_id:
                products = [await self._get_product(product_id)]
            else:
                products = await self._get_all_products(provider)
            
            sync_results["total_products"] = len(products)
            
            # Queue products for inventory sync
            for product in products:
                if product:
                    await self.inventory_queue.put({
                        "action": "sync_inventory",
                        "product": product
                    })
            
            return sync_results
            
        except Exception as e:
            return {
                "total_products": 0,
                "updated_products": 0,
                "errors": [str(e)]
            }
    
    async def get_inventory_status(
        self,
        product_id: UUID,
        variant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get current inventory status"""
        try:
            query = self.supabase.table("inventory")\
                .select("*")\
                .eq("product_id", str(product_id))
            
            if variant_id:
                query = query.eq("variant_id", variant_id)
            
            result = query.execute()
            
            inventory_data = []
            for item in result.data:
                inventory = Inventory(**item)
                
                # Get cached real-time data if available
                cache_key = f"inventory:{product_id}:{item['variant_id']}"
                cached = await self.cache.get(cache_key)
                
                if cached:
                    inventory.quantity_available = cached.get("quantity", inventory.quantity_available)
                    inventory.last_updated = datetime.fromisoformat(cached.get("last_updated", inventory.last_updated.isoformat()))
                
                inventory_data.append(inventory.dict())
            
            return {
                "product_id": str(product_id),
                "inventory": inventory_data,
                "last_sync": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "product_id": str(product_id),
                "inventory": [],
                "error": str(e)
            }
    
    async def estimate_shipping(
        self,
        items: List[Dict[str, Any]],
        shipping_address: Address
    ) -> Dict[str, Any]:
        """Estimate shipping costs for items"""
        try:
            estimates = {}
            
            # Group items by provider
            provider_items = {}
            for item in items:
                product = await self._get_product(UUID(item["product_id"]))
                if product:
                    provider = product.provider
                    if provider not in provider_items:
                        provider_items[provider] = []
                    provider_items[provider].append(item)
            
            # Get estimates from each provider
            for provider, provider_item_list in provider_items.items():
                estimate = await self._get_shipping_estimate(
                    provider,
                    provider_item_list,
                    shipping_address
                )
                estimates[provider.value] = estimate
            
            # Calculate combined estimate
            total_cost = sum(est.get("cost", 0) for est in estimates.values())
            min_days = min(est.get("min_days", 7) for est in estimates.values())
            max_days = max(est.get("max_days", 14) for est in estimates.values())
            
            return {
                "total_cost": total_cost,
                "estimated_delivery": {
                    "min_days": min_days,
                    "max_days": max_days
                },
                "provider_breakdown": estimates
            }
            
        except Exception as e:
            return {
                "total_cost": 0,
                "estimated_delivery": {"min_days": 7, "max_days": 14},
                "error": str(e)
            }
    
    async def handle_webhook(
        self,
        provider: PODProvider,
        webhook_data: Dict[str, Any]
    ) -> bool:
        """Handle incoming webhook from POD provider"""
        try:
            webhook = PODWebhook(
                id=uuid4(),
                provider=provider,
                webhook_type=webhook_data.get("type", "unknown"),
                event_data=webhook_data,
                processed=False,
                created_at=datetime.utcnow()
            )
            
            # Store webhook data
            result = self.supabase.table("pod_webhooks")\
                .insert(webhook.dict())\
                .execute()
            
            # Process webhook based on type
            if webhook.webhook_type == "order_update":
                await self._process_order_webhook(webhook)
            elif webhook.webhook_type == "inventory_update":
                await self._process_inventory_webhook(webhook)
            
            # Mark as processed
            webhook.processed = True
            webhook.processed_at = datetime.utcnow()
            
            self.supabase.table("pod_webhooks")\
                .update({"processed": True, "processed_at": webhook.processed_at.isoformat()})\
                .eq("id", str(webhook.id))\
                .execute()
            
            return True
            
        except Exception as e:
            print(f"Webhook processing error: {e}")
            return False
    
    async def _order_worker(self):
        """Background worker for order processing"""
        while True:
            try:
                order = await self.order_queue.get()
                await self._process_order(order)
                self.order_queue.task_done()
                
            except Exception as e:
                print(f"Order worker error: {e}")
                await asyncio.sleep(1)
    
    async def _bulk_worker(self):
        """Background worker for bulk order processing"""
        while True:
            try:
                bulk_order = await self.bulk_queue.get()
                await self._process_bulk_order(bulk_order)
                self.bulk_queue.task_done()
                
            except Exception as e:
                print(f"Bulk worker error: {e}")
                await asyncio.sleep(5)
    
    async def _inventory_worker(self):
        """Background worker for inventory synchronization"""
        while True:
            try:
                task = await self.inventory_queue.get()
                
                if task["action"] == "sync_inventory":
                    await self._sync_product_inventory(task["product"])
                elif task["action"] == "update_stock":
                    await self._update_stock_levels(task["data"])
                
                self.inventory_queue.task_done()
                
            except Exception as e:
                print(f"Inventory worker error: {e}")
                await asyncio.sleep(2)
    
    async def _inventory_sync_scheduler(self):
        """Periodic inventory synchronization"""
        while True:
            try:
                await asyncio.sleep(3600)  # Every hour
                await self.sync_inventory()
                
            except Exception as e:
                print(f"Inventory sync scheduler error: {e}")
    
    async def _order_status_checker(self):
        """Periodic order status updates"""
        while True:
            try:
                await asyncio.sleep(1800)  # Every 30 minutes
                await self._check_pending_orders()
                
            except Exception as e:
                print(f"Order status checker error: {e}")
    
    async def _process_order(self, order: Order):
        """Process order with POD providers"""
        try:
            order.status = OrderStatus.PROCESSING
            await self._update_order_cache(order)
            
            # Group items by provider
            provider_orders = {}
            for item in order.items:
                product = await self._get_product(item.product_id)
                if product:
                    provider = product.provider
                    if provider not in provider_orders:
                        provider_orders[provider] = []
                    provider_orders[provider].append(item)
            
            # Submit to each provider
            for provider, items in provider_orders.items():
                provider_order_id = await self._submit_to_provider(provider, order, items)
                if provider_order_id:
                    order.provider_orders[provider.value] = provider_order_id
            
            # Update order status
            if order.provider_orders:
                order.status = OrderStatus.PRINTED
            else:
                order.status = OrderStatus.FAILED
            
            await self._update_order_cache(order)
            await self._store_order_update(order)
            
        except Exception as e:
            order.status = OrderStatus.FAILED
            await self._update_order_cache(order)
            print(f"Order processing error: {e}")
    
    async def _process_bulk_order(self, bulk_order: BulkOrder):
        """Process bulk order"""
        try:
            bulk_order.status = "processing"
            await self._update_bulk_order(bulk_order)
            
            # Process items in batches
            batch_size = 10
            created_orders = []
            
            for i in range(0, len(bulk_order.order_items), batch_size):
                batch = bulk_order.order_items[i:i + batch_size]
                
                for item_data in batch:
                    try:
                        # Create individual order
                        order_data = {
                            "items": [item_data],
                            "customer_email": item_data.get("customer_email"),
                            "shipping_address": item_data.get("shipping_address")
                        }
                        
                        # Mock user context for bulk orders
                        user_context = SecurityContext(
                            user_id=bulk_order.user_id,
                            role="user",
                            permissions=[]
                        )
                        
                        order = await self.create_order(order_data, user_context)
                        created_orders.append(order.id)
                        
                        bulk_order.processed_items += 1
                        
                    except Exception as e:
                        bulk_order.failed_items += 1
                        bulk_order.error_log.append(f"Item {i}: {str(e)}")
                
                # Update progress
                await self._update_bulk_order(bulk_order)
                
                # Small delay between batches
                await asyncio.sleep(1)
            
            bulk_order.created_orders = created_orders
            bulk_order.status = "completed"
            await self._update_bulk_order(bulk_order)
            
        except Exception as e:
            bulk_order.status = "failed"
            bulk_order.error_log.append(str(e))
            await self._update_bulk_order(bulk_order)
    
    async def _sync_product_inventory(self, product: Product):
        """Sync inventory for a specific product"""
        try:
            provider_config = self.providers.get(product.provider)
            if not provider_config:
                return
            
            # Get inventory data from provider (mock implementation)
            inventory_data = await self._fetch_provider_inventory(product.provider, product.provider_product_id)
            
            if inventory_data:
                for variant_data in inventory_data:
                    # Update or create inventory record
                    inventory = Inventory(
                        id=uuid4(),
                        product_id=product.id,
                        variant_id=variant_data["variant_id"],
                        provider=product.provider,
                        quantity_available=variant_data["quantity"],
                        current_price=Money(amount=variant_data["price"], currency="USD"),
                        last_updated=datetime.utcnow()
                    )
                    
                    # Store in database
                    result = self.supabase.table("inventory")\
                        .upsert(inventory.dict())\
                        .execute()
                    
                    # Update cache
                    cache_key = f"inventory:{product.id}:{variant_data['variant_id']}"
                    await self.cache.set(
                        cache_key,
                        {
                            "quantity": variant_data["quantity"],
                            "price": variant_data["price"],
                            "last_updated": inventory.last_updated.isoformat()
                        },
                        ttl=1800  # 30 minutes
                    )
            
        except Exception as e:
            print(f"Product inventory sync error: {e}")
    
    def _generate_order_number(self) -> str:
        """Generate unique order number"""
        import time
        import random
        timestamp = int(time.time())
        random_num = random.randint(1000, 9999)
        return f"FB-{timestamp}-{random_num}"
    
    async def _calculate_order_totals(self, order: Order):
        """Calculate order totals"""
        subtotal = Money(amount=0.0, currency="USD")
        
        for item in order.items:
            item_total = Money(
                amount=item.unit_price.amount * item.quantity,
                currency=item.unit_price.currency
            )
            subtotal.amount += item_total.amount
            item.total_price = item_total
        
        order.subtotal = subtotal
        order.total_amount = Money(
            amount=subtotal.amount + order.shipping_cost.amount + order.tax_amount.amount - order.discount_amount.amount,
            currency="USD"
        )
    
    async def _route_order_items(self, order: Order):
        """Route order items to optimal providers"""
        # For now, items stay with their original provider
        # In a real implementation, this would consider costs, availability, etc.
        pass
    
    async def _get_product(self, product_id: UUID) -> Optional[Product]:
        """Get product by ID"""
        try:
            result = self.supabase.table("products")\
                .select("*")\
                .eq("id", str(product_id))\
                .execute()
            
            if result.data:
                return Product(**result.data[0])
            
            return None
            
        except Exception:
            return None
    
    async def _get_all_products(self, provider: Optional[PODProvider] = None) -> List[Product]:
        """Get all products, optionally filtered by provider"""
        try:
            query = self.supabase.table("products").select("*")
            
            if provider:
                query = query.eq("provider", provider.value)
            
            result = query.execute()
            return [Product(**p) for p in result.data]
            
        except Exception:
            return []
    
    async def _estimate_bulk_cost(self, items: List[Dict[str, Any]]) -> Money:
        """Estimate total cost for bulk order"""
        # Mock implementation
        return Money(amount=len(items) * 25.00, currency="USD")
    
    async def _get_shipping_estimate(
        self,
        provider: PODProvider,
        items: List[Dict[str, Any]],
        address: Address
    ) -> Dict[str, Any]:
        """Get shipping estimate from provider"""
        # Mock implementation
        return {
            "cost": 5.99,
            "min_days": 3,
            "max_days": 7,
            "method": "standard"
        }
    
    async def _submit_to_provider(
        self,
        provider: PODProvider,
        order: Order,
        items: List[OrderItem]
    ) -> Optional[str]:
        """Submit order to POD provider"""
        # Mock implementation - would call actual provider APIs
        import secrets
        return f"{provider.value}-{secrets.token_hex(8)}"
    
    async def _fetch_provider_inventory(
        self,
        provider: PODProvider,
        product_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch inventory data from provider"""
        # Mock implementation
        return [
            {
                "variant_id": "variant-1",
                "quantity": 100,
                "price": 19.99
            },
            {
                "variant_id": "variant-2",
                "quantity": 50,
                "price": 24.99
            }
        ]
    
    async def _update_order_cache(self, order: Order):
        """Update order in cache"""
        await self.cache.set(f"order:{order.id}", order.dict(), ttl=86400)
    
    async def _update_bulk_order(self, bulk_order: BulkOrder):
        """Update bulk order in database"""
        self.supabase.table("bulk_orders")\
            .update(bulk_order.dict())\
            .eq("id", str(bulk_order.id))\
            .execute()
    
    async def _store_order_update(self, order: Order):
        """Store order update in database"""
        self.supabase.table("orders")\
            .update(order.dict())\
            .eq("id", str(order.id))\
            .execute()
    
    async def _update_tracking_info(self, order: Order):
        """Update order tracking information"""
        # Mock implementation - would fetch from provider APIs
        pass
    
    async def _check_pending_orders(self):
        """Check status of pending orders"""
        # Mock implementation - would query providers for updates
        pass
    
    async def _process_order_webhook(self, webhook: PODWebhook):
        """Process order-related webhook"""
        # Extract order info and update status
        pass
    
    async def _process_inventory_webhook(self, webhook: PODWebhook):
        """Process inventory-related webhook"""
        # Update inventory levels
        pass
    
    async def _update_stock_levels(self, data: Dict[str, Any]):
        """Update stock levels from webhook data"""
        pass
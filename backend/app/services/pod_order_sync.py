"""
POD Order Synchronization Service
Ensures order status consistency between FlowBotz and POD providers
Handles webhook failures and provides fallback sync mechanisms
"""

import asyncio
import os
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..database import db_service
import logging

logger = logging.getLogger(__name__)

class PODOrderSyncService:
    """Service to sync order status with POD providers"""
    
    def __init__(self):
        self.printful_api_key = os.getenv("PRINTFUL_API_KEY")
        self.printify_api_key = os.getenv("PRINTIFY_API_KEY")
        self.sync_interval_minutes = 15  # Sync every 15 minutes
        self.max_retries = 3
        self.timeout = 30.0
        
    async def start_background_sync(self):
        """Start background sync process"""
        while True:
            try:
                await self.sync_all_pending_orders()
                await asyncio.sleep(self.sync_interval_minutes * 60)
            except Exception as e:
                logger.error(f"Background sync error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def sync_all_pending_orders(self):
        """Sync all orders that are not yet delivered/canceled"""
        try:
            # Get orders that need status updates
            orders = await self.get_orders_needing_sync()
            
            sync_tasks = []
            for order in orders:
                metadata = order.get('metadata', {})
                products = metadata.get('products', [])
                
                for product in products:
                    pod_order_id = product.get('pod_order_id')
                    provider = product.get('provider')
                    
                    if pod_order_id and provider:
                        task = self.sync_order_status(order['id'], pod_order_id, provider)
                        sync_tasks.append(task)
            
            if sync_tasks:
                results = await asyncio.gather(*sync_tasks, return_exceptions=True)
                successful_syncs = sum(1 for r in results if r is True)
                logger.info(f"Synced {successful_syncs}/{len(sync_tasks)} orders")
            
        except Exception as e:
            logger.error(f"Error syncing all orders: {e}")
    
    async def get_orders_needing_sync(self) -> List[Dict]:
        """Get orders that need status synchronization"""
        try:
            # Get orders that are not in final states
            result = db_service.supabase.table("orders").select("*").in_(
                "status", 
                ["pending", "confirmed", "in_production", "shipped"]
            ).execute()
            
            # Filter orders older than 5 minutes to allow for webhook processing
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
            
            filtered_orders = []
            for order in result.data:
                try:
                    created_at = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
                    if created_at < five_minutes_ago:
                        filtered_orders.append(order)
                except Exception:
                    # Include orders with invalid timestamps
                    filtered_orders.append(order)
            
            return filtered_orders
            
        except Exception as e:
            logger.error(f"Error getting orders for sync: {e}")
            return []
    
    async def sync_order_status(self, order_id: str, pod_order_id: str, provider: str) -> bool:
        """Sync single order status with POD provider"""
        try:
            # Get current status from POD provider
            if provider.lower() == "printful":
                status_data = await self.get_printful_order_status(pod_order_id)
            elif provider.lower() == "printify":
                status_data = await self.get_printify_order_status(pod_order_id)
            else:
                logger.warning(f"Unknown provider: {provider}")
                return False
            
            if not status_data:
                return False
            
            # Update order in database
            updates = {
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Map status
            if provider.lower() == "printful":
                updates['status'] = self.map_printful_status(status_data.get('status', ''))
            elif provider.lower() == "printify":
                updates['status'] = self.map_printify_status(status_data.get('status', ''))
            
            # Add tracking info if available
            if status_data.get('tracking_number'):
                updates['tracking_number'] = status_data['tracking_number']
            
            if status_data.get('tracking_url'):
                updates['tracking_url'] = status_data['tracking_url']
            
            if status_data.get('carrier'):
                updates['carrier'] = status_data['carrier']
            
            # Set timestamp based on status
            if updates['status'] == 'shipped' and not updates.get('shipped_at'):
                updates['shipped_at'] = datetime.utcnow().isoformat()
            elif updates['status'] == 'delivered' and not updates.get('delivered_at'):
                updates['delivered_at'] = datetime.utcnow().isoformat()
            
            # Update database
            result = db_service.supabase.table("orders").update(updates).eq("id", order_id).execute()
            
            if result.data:
                logger.info(f"✅ Synced order {order_id} status: {updates['status']}")
                
                # Track status update
                await db_service.track_event(
                    user_id=result.data[0].get('user_id'),
                    event_type="pod",
                    event_action="order_status_synced",
                    properties={
                        "order_id": order_id,
                        "pod_order_id": pod_order_id,
                        "provider": provider,
                        "new_status": updates['status'],
                        "sync_source": "background_sync"
                    }
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error syncing order {order_id}: {e}")
            return False
    
    async def get_printful_order_status(self, order_id: str) -> Optional[Dict]:
        """Get order status from Printful API"""
        if not self.printful_api_key:
            return None
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"https://api.printful.com/orders/{order_id}",
                    headers={
                        "Authorization": f"Bearer {self.printful_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    order_info = data.get("result", {})
                    
                    return {
                        "status": order_info.get("status"),
                        "tracking_number": order_info.get("tracking_number"),
                        "tracking_url": order_info.get("tracking_url"),
                        "carrier": order_info.get("carrier"),
                        "estimated_delivery": order_info.get("estimated_delivery")
                    }
                else:
                    logger.warning(f"Printful API error {response.status_code} for order {order_id}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error getting Printful order status: {e}")
                return None
    
    async def get_printify_order_status(self, order_id: str) -> Optional[Dict]:
        """Get order status from Printify API"""
        if not self.printify_api_key:
            return None
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # Get shops first
                shops_response = await client.get(
                    "https://api.printify.com/v1/shops.json",
                    headers={
                        "Authorization": f"Bearer {self.printify_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if shops_response.status_code != 200:
                    return None
                
                shops = shops_response.json()
                if not shops:
                    return None
                
                shop_id = shops[0]["id"]
                
                # Get order status
                response = await client.get(
                    f"https://api.printify.com/v1/shops/{shop_id}/orders/{order_id}.json",
                    headers={
                        "Authorization": f"Bearer {self.printify_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extract tracking info from shipments
                    tracking_number = None
                    tracking_url = None
                    carrier = None
                    
                    shipments = data.get("shipments", [])
                    if shipments:
                        shipment = shipments[0]
                        tracking_number = shipment.get("tracking_number")
                        tracking_url = shipment.get("tracking_url") 
                        carrier = shipment.get("carrier")
                    
                    return {
                        "status": data.get("status"),
                        "tracking_number": tracking_number,
                        "tracking_url": tracking_url,
                        "carrier": carrier
                    }
                else:
                    logger.warning(f"Printify API error {response.status_code} for order {order_id}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error getting Printify order status: {e}")
                return None
    
    def map_printful_status(self, status: str) -> str:
        """Map Printful status to internal status"""
        status_mapping = {
            'draft': 'pending',
            'pending': 'pending', 
            'confirmed': 'confirmed',
            'inprocess': 'in_production',
            'onhold': 'on_hold',
            'partial': 'partial',
            'fulfilled': 'shipped',
            'canceled': 'canceled',
            'failed': 'failed'
        }
        return status_mapping.get(status.lower(), 'pending')
    
    def map_printify_status(self, status: str) -> str:
        """Map Printify status to internal status"""
        status_mapping = {
            'pending': 'pending',
            'in_production': 'in_production',
            'sent_to_production': 'in_production',
            'fulfilled': 'shipped',
            'shipped': 'shipped',
            'delivered': 'delivered',
            'canceled': 'canceled',
            'on_hold': 'on_hold'
        }
        return status_mapping.get(status.lower(), 'pending')
    
    async def force_sync_order(self, order_id: str) -> bool:
        """Force sync a specific order immediately"""
        try:
            # Get order from database
            result = db_service.supabase.table("orders").select("*").eq("id", order_id).execute()
            
            if not result.data:
                return False
            
            order = result.data[0]
            metadata = order.get('metadata', {})
            products = metadata.get('products', [])
            
            if not products:
                return False
            
            product = products[0]
            pod_order_id = product.get('pod_order_id')
            provider = product.get('provider')
            
            if not pod_order_id or not provider:
                return False
            
            return await self.sync_order_status(order_id, pod_order_id, provider)
            
        except Exception as e:
            logger.error(f"Error force syncing order {order_id}: {e}")
            return False
    
    async def sync_stale_orders(self):
        """Sync orders that haven't been updated in a while"""
        try:
            # Get orders not updated in last 4 hours and not in final states
            four_hours_ago = datetime.utcnow() - timedelta(hours=4)
            
            result = db_service.supabase.table("orders").select("*").in_(
                "status", 
                ["pending", "confirmed", "in_production", "shipped"]
            ).lt("updated_at", four_hours_ago.isoformat()).execute()
            
            stale_orders = result.data
            
            for order in stale_orders:
                metadata = order.get('metadata', {})
                products = metadata.get('products', [])
                
                for product in products:
                    pod_order_id = product.get('pod_order_id')
                    provider = product.get('provider')
                    
                    if pod_order_id and provider:
                        await self.sync_order_status(order['id'], pod_order_id, provider)
                        # Add small delay to avoid API rate limits
                        await asyncio.sleep(1)
            
            logger.info(f"Synced {len(stale_orders)} stale orders")
            
        except Exception as e:
            logger.error(f"Error syncing stale orders: {e}")

# Global instance
pod_sync_service = PODOrderSyncService()

async def start_pod_sync_service():
    """Start the POD sync service"""
    asyncio.create_task(pod_sync_service.start_background_sync())
    logger.info("🔄 POD Order Sync Service started")
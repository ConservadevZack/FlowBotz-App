"""
Webhook Service
Enterprise webhook system for real-time notifications and integrations
"""

from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import json
import asyncio
import hmac
import hashlib
import os
from enum import Enum

import aiohttp
from fastapi import HTTPException, status
from supabase import create_client, Client
from models.enterprise import (
    WebhookEndpoint, WebhookDelivery, WebhookEvent, WebhookStatus
)
from models.common import SecurityContext
from .caching import CachingService

class WebhookService:
    """Enterprise webhook service with reliable delivery"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.cache = CachingService()
        self.delivery_queue = asyncio.Queue(maxsize=5000)
        self.retry_queue = asyncio.Queue(maxsize=1000)
        
        # Delivery configuration
        self.max_concurrent_deliveries = 10
        self.default_timeout = 30
        self.max_retry_attempts = 5
        self.retry_delays = [1, 5, 15, 60, 300]  # seconds
        
        # Start background workers
        self._start_workers()
    
    def _start_workers(self):
        """Start webhook delivery workers"""
        # Main delivery workers
        for _ in range(self.max_concurrent_deliveries):
            asyncio.create_task(self._delivery_worker())
        
        # Retry worker
        asyncio.create_task(self._retry_worker())
        
        # Health monitor
        asyncio.create_task(self._health_monitor())
    
    async def create_webhook_endpoint(
        self,
        organization_id: UUID,
        endpoint_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> WebhookEndpoint:
        """Create new webhook endpoint"""
        try:
            # Generate secure secret
            secret = self._generate_webhook_secret()
            
            endpoint = WebhookEndpoint(
                id=uuid4(),
                organization_id=organization_id,
                name=endpoint_data["name"],
                url=endpoint_data["url"],
                secret=secret,
                subscribed_events=endpoint_data.get("events", []),
                timeout_seconds=endpoint_data.get("timeout", self.default_timeout),
                max_retries=endpoint_data.get("max_retries", 3),
                filters=endpoint_data.get("filters", {}),
                is_active=endpoint_data.get("is_active", True),
                created_at=datetime.utcnow()
            )
            
            # Store in database
            result = self.supabase.table("webhook_endpoints")\
                .insert(endpoint.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create webhook endpoint"
                )
            
            # Cache for quick access
            await self.cache.set(
                f"webhook_endpoint:{endpoint.id}",
                endpoint.dict(),
                ttl=3600
            )
            
            return endpoint
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create webhook endpoint: {str(e)}"
            )
    
    async def send_webhook(
        self,
        event_type: WebhookEvent,
        event_data: Dict[str, Any],
        organization_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[UUID]:
        """Send webhook to all subscribed endpoints"""
        try:
            # Get matching endpoints
            endpoints = await self._get_matching_endpoints(
                event_type, 
                organization_id, 
                filters
            )
            
            delivery_ids = []
            
            for endpoint in endpoints:
                # Create delivery record
                delivery = WebhookDelivery(
                    id=uuid4(),
                    endpoint_id=endpoint.id,
                    event_type=event_type,
                    event_id=uuid4(),  # This would be the actual event ID
                    request_url=str(endpoint.url),
                    request_method="POST",
                    request_body=event_data,
                    status=WebhookStatus.PENDING,
                    attempt_number=1,
                    created_at=datetime.utcnow()
                )
                
                # Add headers including signature
                delivery.request_headers = self._create_webhook_headers(
                    event_data, 
                    endpoint.secret,
                    event_type
                )
                
                # Queue for delivery
                await self.delivery_queue.put((endpoint, delivery))
                delivery_ids.append(delivery.id)
            
            return delivery_ids
            
        except Exception as e:
            print(f"Webhook send error: {e}")
            return []
    
    async def get_webhook_deliveries(
        self,
        endpoint_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[WebhookDelivery]:
        """Get webhook delivery history"""
        try:
            result = self.supabase.table("webhook_deliveries")\
                .select("*")\
                .eq("endpoint_id", str(endpoint_id))\
                .order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()
            
            return [WebhookDelivery(**d) for d in result.data]
            
        except Exception as e:
            print(f"Get deliveries error: {e}")
            return []
    
    async def retry_webhook_delivery(
        self,
        delivery_id: UUID,
        user_context: SecurityContext
    ) -> bool:
        """Manually retry webhook delivery"""
        try:
            # Get delivery record
            result = self.supabase.table("webhook_deliveries")\
                .select("*")\
                .eq("id", str(delivery_id))\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Webhook delivery not found"
                )
            
            delivery = WebhookDelivery(**result.data[0])
            
            # Get endpoint
            endpoint = await self._get_endpoint(delivery.endpoint_id)
            if not endpoint:
                return False
            
            # Reset delivery status and increment attempt
            delivery.status = WebhookStatus.PENDING
            delivery.attempt_number += 1
            delivery.error_message = None
            
            # Queue for retry
            await self.delivery_queue.put((endpoint, delivery))
            
            return True
            
        except Exception as e:
            print(f"Retry webhook error: {e}")
            return False
    
    async def get_webhook_stats(
        self,
        endpoint_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get webhook endpoint statistics"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get delivery stats from cache if available
            cache_key = f"webhook_stats:{endpoint_id}:{days}"
            cached_stats = await self.cache.get(cache_key)
            
            if cached_stats:
                return cached_stats
            
            # Calculate stats from database
            result = self.supabase.table("webhook_deliveries")\
                .select("status, duration_ms, created_at")\
                .eq("endpoint_id", str(endpoint_id))\
                .gte("created_at", start_date.isoformat())\
                .execute()
            
            deliveries = result.data
            total_deliveries = len(deliveries)
            successful_deliveries = sum(1 for d in deliveries if d["status"] == "delivered")
            failed_deliveries = total_deliveries - successful_deliveries
            
            # Calculate average response time
            response_times = [d.get("duration_ms", 0) for d in deliveries if d.get("duration_ms")]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            stats = {
                "total_deliveries": total_deliveries,
                "successful_deliveries": successful_deliveries,
                "failed_deliveries": failed_deliveries,
                "success_rate": (successful_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0,
                "average_response_time_ms": avg_response_time,
                "period_days": days
            }
            
            # Cache stats for 1 hour
            await self.cache.set(cache_key, stats, ttl=3600)
            
            return stats
            
        except Exception as e:
            print(f"Webhook stats error: {e}")
            return {}
    
    async def test_webhook_endpoint(
        self,
        endpoint_id: UUID,
        user_context: SecurityContext
    ) -> bool:
        """Send test webhook to endpoint"""
        try:
            endpoint = await self._get_endpoint(endpoint_id)
            if not endpoint:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Webhook endpoint not found"
                )
            
            # Create test event
            test_event = {
                "event": "webhook.test",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "message": "This is a test webhook from FlowBotz",
                    "endpoint_id": str(endpoint_id)
                }
            }
            
            # Create test delivery
            delivery = WebhookDelivery(
                id=uuid4(),
                endpoint_id=endpoint.id,
                event_type="webhook.test",
                event_id=uuid4(),
                request_url=str(endpoint.url),
                request_method="POST",
                request_body=test_event,
                request_headers=self._create_webhook_headers(
                    test_event, 
                    endpoint.secret, 
                    "webhook.test"
                ),
                status=WebhookStatus.PENDING,
                attempt_number=1,
                created_at=datetime.utcnow()
            )
            
            # Send immediately
            success = await self._deliver_webhook(endpoint, delivery)
            
            return success
            
        except Exception as e:
            print(f"Test webhook error: {e}")
            return False
    
    async def _delivery_worker(self):
        """Background worker for webhook deliveries"""
        while True:
            try:
                endpoint, delivery = await self.delivery_queue.get()
                await self._deliver_webhook(endpoint, delivery)
                self.delivery_queue.task_done()
                
            except Exception as e:
                print(f"Delivery worker error: {e}")
                await asyncio.sleep(1)
    
    async def _retry_worker(self):
        """Background worker for webhook retries"""
        while True:
            try:
                endpoint, delivery = await self.retry_queue.get()
                
                # Check if we should retry
                if delivery.attempt_number <= endpoint.max_retries:
                    # Calculate delay based on attempt number
                    delay_index = min(delivery.attempt_number - 1, len(self.retry_delays) - 1)
                    delay = self.retry_delays[delay_index]
                    
                    await asyncio.sleep(delay)
                    await self._deliver_webhook(endpoint, delivery)
                else:
                    # Max retries reached
                    delivery.status = WebhookStatus.FAILED
                    delivery.max_retries_reached = True
                    await self._update_delivery_status(delivery)
                
                self.retry_queue.task_done()
                
            except Exception as e:
                print(f"Retry worker error: {e}")
                await asyncio.sleep(5)
    
    async def _health_monitor(self):
        """Monitor webhook endpoint health"""
        while True:
            try:
                await asyncio.sleep(300)  # 5 minutes
                await self._check_endpoint_health()
                
            except Exception as e:
                print(f"Health monitor error: {e}")
    
    async def _deliver_webhook(
        self, 
        endpoint: WebhookEndpoint, 
        delivery: WebhookDelivery
    ) -> bool:
        """Deliver webhook to endpoint"""
        start_time = datetime.utcnow()
        
        try:
            timeout = aiohttp.ClientTimeout(total=endpoint.timeout_seconds)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    delivery.request_url,
                    json=delivery.request_body,
                    headers=delivery.request_headers
                ) as response:
                    # Calculate duration
                    duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                    
                    # Update delivery record
                    delivery.response_status = response.status
                    delivery.response_headers = dict(response.headers)
                    delivery.response_body = await response.text()
                    delivery.duration_ms = int(duration)
                    
                    # Check if successful
                    if 200 <= response.status < 300:
                        delivery.status = WebhookStatus.DELIVERED
                        await self._update_endpoint_success(endpoint.id)
                        success = True
                    else:
                        delivery.status = WebhookStatus.FAILED
                        delivery.error_message = f"HTTP {response.status}: {delivery.response_body}"
                        await self._update_endpoint_failure(endpoint.id)
                        success = False
            
        except asyncio.TimeoutError:
            delivery.status = WebhookStatus.FAILED
            delivery.error_message = "Request timeout"
            success = False
            
        except Exception as e:
            delivery.status = WebhookStatus.FAILED
            delivery.error_message = str(e)
            success = False
        
        # Update delivery status in database
        await self._update_delivery_status(delivery)
        
        # Queue for retry if failed and retries available
        if not success and delivery.attempt_number < endpoint.max_retries:
            delivery.attempt_number += 1
            await self.retry_queue.put((endpoint, delivery))
        
        return success
    
    async def _get_matching_endpoints(
        self,
        event_type: WebhookEvent,
        organization_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[WebhookEndpoint]:
        """Get webhook endpoints matching event criteria"""
        try:
            query = self.supabase.table("webhook_endpoints")\
                .select("*")\
                .eq("is_active", True)\
                .contains("subscribed_events", [event_type.value])
            
            if organization_id:
                query = query.eq("organization_id", str(organization_id))
            
            result = query.execute()
            
            endpoints = [WebhookEndpoint(**e) for e in result.data]
            
            # Apply additional filters if specified
            if filters:
                filtered_endpoints = []
                for endpoint in endpoints:
                    if self._matches_filters(endpoint.filters, filters):
                        filtered_endpoints.append(endpoint)
                return filtered_endpoints
            
            return endpoints
            
        except Exception as e:
            print(f"Get matching endpoints error: {e}")
            return []
    
    async def _get_endpoint(self, endpoint_id: UUID) -> Optional[WebhookEndpoint]:
        """Get webhook endpoint by ID"""
        try:
            # Check cache first
            cached = await self.cache.get(f"webhook_endpoint:{endpoint_id}")
            if cached:
                return WebhookEndpoint(**cached)
            
            # Query database
            result = self.supabase.table("webhook_endpoints")\
                .select("*")\
                .eq("id", str(endpoint_id))\
                .execute()
            
            if result.data:
                endpoint = WebhookEndpoint(**result.data[0])
                # Cache for future use
                await self.cache.set(
                    f"webhook_endpoint:{endpoint_id}",
                    endpoint.dict(),
                    ttl=3600
                )
                return endpoint
            
            return None
            
        except Exception as e:
            print(f"Get endpoint error: {e}")
            return None
    
    def _create_webhook_headers(
        self,
        payload: Dict[str, Any],
        secret: str,
        event_type: str
    ) -> Dict[str, str]:
        """Create webhook request headers with signature"""
        # Create payload string
        payload_string = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        
        # Generate HMAC signature
        signature = hmac.new(
            secret.encode(),
            payload_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            "Content-Type": "application/json",
            "X-FlowBotz-Signature": f"sha256={signature}",
            "X-FlowBotz-Event": event_type,
            "X-FlowBotz-Timestamp": str(int(datetime.utcnow().timestamp())),
            "User-Agent": "FlowBotz-Webhooks/1.0"
        }
    
    def _generate_webhook_secret(self) -> str:
        """Generate secure webhook secret"""
        import secrets
        return secrets.token_hex(32)
    
    def _matches_filters(
        self, 
        endpoint_filters: Dict[str, Any], 
        event_filters: Dict[str, Any]
    ) -> bool:
        """Check if event matches endpoint filters"""
        if not endpoint_filters:
            return True
        
        for key, expected_value in endpoint_filters.items():
            if key not in event_filters:
                return False
            if event_filters[key] != expected_value:
                return False
        
        return True
    
    async def _update_delivery_status(self, delivery: WebhookDelivery):
        """Update delivery status in database"""
        try:
            self.supabase.table("webhook_deliveries")\
                .upsert(delivery.dict())\
                .execute()
                
        except Exception as e:
            print(f"Update delivery status error: {e}")
    
    async def _update_endpoint_success(self, endpoint_id: UUID):
        """Update endpoint success metrics"""
        try:
            # Update database counters
            self.supabase.table("webhook_endpoints")\
                .update({
                    "successful_deliveries": "successful_deliveries + 1",
                    "last_success": datetime.utcnow().isoformat(),
                    "consecutive_failures": 0
                })\
                .eq("id", str(endpoint_id))\
                .execute()
            
            # Clear cache
            await self.cache.delete(f"webhook_endpoint:{endpoint_id}")
            
        except Exception as e:
            print(f"Update endpoint success error: {e}")
    
    async def _update_endpoint_failure(self, endpoint_id: UUID):
        """Update endpoint failure metrics"""
        try:
            # Update database counters
            self.supabase.table("webhook_endpoints")\
                .update({
                    "failed_deliveries": "failed_deliveries + 1",
                    "consecutive_failures": "consecutive_failures + 1"
                })\
                .eq("id", str(endpoint_id))\
                .execute()
            
            # Clear cache
            await self.cache.delete(f"webhook_endpoint:{endpoint_id}")
            
        except Exception as e:
            print(f"Update endpoint failure error: {e}")
    
    async def _check_endpoint_health(self):
        """Check health of all webhook endpoints"""
        # This would disable endpoints with too many consecutive failures
        try:
            # Get endpoints with high failure rates
            result = self.supabase.table("webhook_endpoints")\
                .select("id, consecutive_failures")\
                .gte("consecutive_failures", 10)\
                .eq("is_active", True)\
                .execute()
            
            for endpoint_data in result.data:
                endpoint_id = endpoint_data["id"]
                failures = endpoint_data["consecutive_failures"]
                
                if failures >= 20:
                    # Disable endpoint after 20 consecutive failures
                    self.supabase.table("webhook_endpoints")\
                        .update({"is_active": False})\
                        .eq("id", endpoint_id)\
                        .execute()
                    
                    print(f"Disabled webhook endpoint {endpoint_id} due to {failures} consecutive failures")
                    
        except Exception as e:
            print(f"Health check error: {e}")
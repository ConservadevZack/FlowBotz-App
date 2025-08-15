"""
Analytics Service
Comprehensive analytics collection and real-time dashboard APIs
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
import json
import asyncio
import os
from dataclasses import dataclass

from fastapi import HTTPException, status
from supabase import create_client, Client
from models.analytics import (
    UserEvent, AnalyticsSession, ConversionFunnel, RevenueMetric, 
    PerformanceMetric, DashboardMetric, EventType
)
from models.common import SecurityContext, Money, GeoLocation
from .caching import CachingService

@dataclass
class EventBatch:
    """Batch of events for processing"""
    events: List[UserEvent]
    timestamp: datetime
    user_id: Optional[UUID] = None

class AnalyticsService:
    """Enterprise analytics service with real-time processing"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.cache = CachingService()
        
        # Event processing queues
        self.event_queue = asyncio.Queue(maxsize=10000)
        self.batch_queue = asyncio.Queue(maxsize=1000)
        
        # Batch configuration
        self.batch_size = 100
        self.batch_timeout = 5  # seconds
        self.current_batch = []
        self.batch_timer = None
        
        # Real-time metrics tracking
        self.active_sessions = {}
        self.conversion_events = set([
            EventType.CHECKOUT_COMPLETE,
            EventType.PAYMENT_SUCCESS,
            EventType.USER_SIGNUP
        ])
        
        # Start background processors
        self._start_processors()
    
    def _start_processors(self):
        """Start background event processors"""
        asyncio.create_task(self._event_processor())
        asyncio.create_task(self._batch_processor())
        asyncio.create_task(self._metrics_aggregator())
        asyncio.create_task(self._session_cleaner())
    
    async def track_event(
        self, 
        event_type: EventType,
        properties: Dict[str, Any],
        user_context: Optional[SecurityContext] = None,
        session_id: Optional[str] = None,
        page_url: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Track user event with real-time processing"""
        try:
            event = UserEvent(
                id=uuid4(),
                user_id=user_context.user_id if user_context else None,
                session_id=session_id,
                event_type=event_type,
                event_name=event_type.value,
                properties=properties,
                page_url=page_url,
                user_agent=user_agent,
                ip_address=ip_address,
                created_at=datetime.utcnow()
            )
            
            # Add to processing queue
            await self.event_queue.put(event)
            
            # Update real-time session data
            if session_id:
                await self._update_session(session_id, event)
            
            # Check for conversion events
            if event_type in self.conversion_events:
                await self._process_conversion(event)
            
            return True
            
        except Exception as e:
            print(f"Analytics tracking error: {e}")
            return False
    
    async def start_session(
        self,
        session_id: str,
        user_context: Optional[SecurityContext] = None,
        device_info: Optional[Dict[str, Any]] = None,
        location: Optional[GeoLocation] = None,
        referrer: Optional[str] = None,
        utm_params: Optional[Dict[str, str]] = None
    ) -> AnalyticsSession:
        """Start new analytics session"""
        session = AnalyticsSession(
            id=uuid4(),
            user_id=user_context.user_id if user_context else None,
            session_id=session_id,
            started_at=datetime.utcnow(),
            device_type=device_info.get("device_type", "desktop") if device_info else "desktop",
            os=device_info.get("os") if device_info else None,
            browser=device_info.get("browser") if device_info else None,
            location=location,
            referrer=referrer
        )
        
        # Add UTM parameters
        if utm_params:
            session.utm_source = utm_params.get("utm_source")
            session.utm_medium = utm_params.get("utm_medium")
            session.utm_campaign = utm_params.get("utm_campaign")
            session.utm_content = utm_params.get("utm_content")
            session.utm_term = utm_params.get("utm_term")
        
        # Store in cache for real-time access
        await self.cache.set(
            f"session:{session_id}", 
            session.dict(), 
            ttl=7200  # 2 hours
        )
        
        # Track session start event
        await self.track_event(
            EventType.PAGE_VIEW,
            {"event": "session_start"},
            user_context,
            session_id
        )
        
        return session
    
    async def end_session(
        self,
        session_id: str,
        final_page: Optional[str] = None
    ) -> bool:
        """End analytics session"""
        try:
            # Get session from cache
            session_data = await self.cache.get(f"session:{session_id}")
            if not session_data:
                return False
            
            session = AnalyticsSession(**session_data)
            
            # Update session end data
            session.ended_at = datetime.utcnow()
            session.duration_seconds = int(
                (session.ended_at - session.started_at).total_seconds()
            )
            session.exit_page = final_page
            
            # Store final session data in database
            result = self.supabase.table("analytics_sessions")\
                .insert(session.dict())\
                .execute()
            
            if not result.data:
                print("Failed to store session data")
            
            # Remove from cache
            await self.cache.delete(f"session:{session_id}")
            
            return True
            
        except Exception as e:
            print(f"Session end error: {e}")
            return False
    
    async def track_page_view(
        self,
        page_url: str,
        page_title: Optional[str] = None,
        referrer: Optional[str] = None,
        user_context: Optional[SecurityContext] = None,
        session_id: Optional[str] = None
    ) -> bool:
        """Track page view with additional metadata"""
        properties = {
            "page_url": page_url,
            "page_title": page_title,
            "referrer": referrer
        }
        
        return await self.track_event(
            EventType.PAGE_VIEW,
            properties,
            user_context,
            session_id,
            page_url
        )
    
    async def track_conversion(
        self,
        conversion_type: str,
        value: Optional[Money] = None,
        properties: Optional[Dict[str, Any]] = None,
        user_context: Optional[SecurityContext] = None,
        session_id: Optional[str] = None
    ) -> bool:
        """Track conversion event with value"""
        conversion_properties = {
            "conversion_type": conversion_type,
            "value": value.dict() if value else None,
            **(properties or {})
        }
        
        # Use appropriate event type based on conversion
        if conversion_type == "purchase":
            event_type = EventType.CHECKOUT_COMPLETE
        elif conversion_type == "signup":
            event_type = EventType.USER_SIGNUP
        else:
            event_type = EventType.FEATURE_USE
        
        return await self.track_event(
            event_type,
            conversion_properties,
            user_context,
            session_id
        )
    
    async def get_dashboard_metrics(
        self,
        user_context: SecurityContext,
        date_range: Tuple[datetime, datetime],
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get dashboard metrics for date range"""
        start_date, end_date = date_range
        
        # Default metrics if none specified
        if not metrics:
            metrics = [
                "total_users", "active_users", "page_views", 
                "conversions", "revenue", "session_duration"
            ]
        
        dashboard_data = {}
        
        for metric in metrics:
            if metric == "total_users":
                dashboard_data[metric] = await self._get_total_users(start_date, end_date)
            elif metric == "active_users":
                dashboard_data[metric] = await self._get_active_users(start_date, end_date)
            elif metric == "page_views":
                dashboard_data[metric] = await self._get_page_views(start_date, end_date)
            elif metric == "conversions":
                dashboard_data[metric] = await self._get_conversions(start_date, end_date)
            elif metric == "revenue":
                dashboard_data[metric] = await self._get_revenue(start_date, end_date)
            elif metric == "session_duration":
                dashboard_data[metric] = await self._get_avg_session_duration(start_date, end_date)
        
        return dashboard_data
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get real-time metrics"""
        # Get current active sessions
        active_sessions_count = len(self.active_sessions)
        
        # Get recent events (last 5 minutes)
        recent_events = await self._get_recent_events(minutes=5)
        
        # Get current conversion rate (last hour)
        conversion_rate = await self._get_current_conversion_rate()
        
        return {
            "active_sessions": active_sessions_count,
            "events_last_5min": len(recent_events),
            "current_conversion_rate": conversion_rate,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_user_journey(
        self,
        user_id: UUID,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List[UserEvent]:
        """Get user's event journey"""
        if not date_range:
            # Default to last 30 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
        else:
            start_date, end_date = date_range
        
        # This would query the database for user events
        # For now, return mock data
        return []
    
    async def create_funnel_analysis(
        self,
        funnel_name: str,
        steps: List[Dict[str, Any]],
        date_range: Tuple[datetime, datetime],
        user_context: SecurityContext
    ) -> ConversionFunnel:
        """Create conversion funnel analysis"""
        start_date, end_date = date_range
        
        funnel = ConversionFunnel(
            id=uuid4(),
            name=funnel_name,
            steps=steps,
            period_start=start_date,
            period_end=end_date,
            created_at=datetime.utcnow()
        )
        
        # Calculate funnel metrics
        for i, step in enumerate(steps):
            step_events = await self._count_events_for_step(step, start_date, end_date)
            funnel.step_metrics[f"step_{i}"] = {
                "count": step_events,
                "step_name": step.get("name", f"Step {i+1}")
            }
            
            if i == 0:
                funnel.total_entries = step_events
        
        # Calculate conversion rate
        if funnel.total_entries > 0 and funnel.step_metrics:
            final_step = list(funnel.step_metrics.values())[-1]
            funnel.conversion_rate = (final_step["count"] / funnel.total_entries) * 100
        
        return funnel
    
    async def _event_processor(self):
        """Process events from queue"""
        while True:
            try:
                event = await self.event_queue.get()
                
                # Add to current batch
                self.current_batch.append(event)
                
                # Process batch if full or timeout reached
                if len(self.current_batch) >= self.batch_size:
                    await self._process_batch()
                elif not self.batch_timer:
                    # Start batch timer
                    self.batch_timer = asyncio.create_task(
                        self._batch_timeout()
                    )
                
            except Exception as e:
                print(f"Event processor error: {e}")
    
    async def _batch_processor(self):
        """Process event batches"""
        while True:
            try:
                batch = await self.batch_queue.get()
                await self._store_batch(batch)
                
            except Exception as e:
                print(f"Batch processor error: {e}")
    
    async def _metrics_aggregator(self):
        """Aggregate metrics periodically"""
        while True:
            try:
                await asyncio.sleep(300)  # 5 minutes
                await self._aggregate_metrics()
                
            except Exception as e:
                print(f"Metrics aggregator error: {e}")
    
    async def _session_cleaner(self):
        """Clean up expired sessions"""
        while True:
            try:
                await asyncio.sleep(3600)  # 1 hour
                await self._cleanup_expired_sessions()
                
            except Exception as e:
                print(f"Session cleaner error: {e}")
    
    async def _process_batch(self):
        """Process current batch of events"""
        if not self.current_batch:
            return
        
        batch = EventBatch(
            events=self.current_batch.copy(),
            timestamp=datetime.utcnow()
        )
        
        await self.batch_queue.put(batch)
        
        # Clear current batch
        self.current_batch.clear()
        
        # Cancel timer if running
        if self.batch_timer:
            self.batch_timer.cancel()
            self.batch_timer = None
    
    async def _batch_timeout(self):
        """Handle batch timeout"""
        await asyncio.sleep(self.batch_timeout)
        await self._process_batch()
    
    async def _store_batch(self, batch: EventBatch):
        """Store batch of events in database"""
        try:
            events_data = [event.dict() for event in batch.events]
            
            result = self.supabase.table("user_events")\
                .insert(events_data)\
                .execute()
            
            if not result.data:
                print("Failed to store event batch")
            
        except Exception as e:
            print(f"Batch storage error: {e}")
    
    async def _update_session(self, session_id: str, event: UserEvent):
        """Update session with new event"""
        session_data = await self.cache.get(f"session:{session_id}")
        if session_data:
            session = AnalyticsSession(**session_data)
            session.events_triggered += 1
            
            # Update specific counters based on event type
            if event.event_type == EventType.PAGE_VIEW:
                session.page_views += 1
            elif event.event_type == EventType.DESIGN_CREATE:
                session.designs_created += 1
            elif event.event_type.startswith("ai_"):
                session.ai_generations += 1
            
            await self.cache.set(f"session:{session_id}", session.dict(), ttl=7200)
    
    async def _process_conversion(self, event: UserEvent):
        """Process conversion event"""
        # Update conversion tracking
        conversion_key = f"conversion:{event.user_id}:{event.event_type.value}"
        await self.cache.set(conversion_key, event.dict(), ttl=86400)
        
        # Update real-time conversion metrics
        await self.cache.increment("conversions:today", ttl=86400)
    
    async def _get_total_users(self, start_date: datetime, end_date: datetime) -> int:
        """Get total users in date range"""
        # This would query the actual database
        return 1250
    
    async def _get_active_users(self, start_date: datetime, end_date: datetime) -> int:
        """Get active users in date range"""
        return 875
    
    async def _get_page_views(self, start_date: datetime, end_date: datetime) -> int:
        """Get page views in date range"""
        return 15420
    
    async def _get_conversions(self, start_date: datetime, end_date: datetime) -> int:
        """Get conversions in date range"""
        return 142
    
    async def _get_revenue(self, start_date: datetime, end_date: datetime) -> Money:
        """Get revenue in date range"""
        return Money(amount=8750.50, currency="USD")
    
    async def _get_avg_session_duration(self, start_date: datetime, end_date: datetime) -> float:
        """Get average session duration in seconds"""
        return 485.2
    
    async def _get_recent_events(self, minutes: int = 5) -> List[UserEvent]:
        """Get recent events"""
        # This would query recent events from cache/database
        return []
    
    async def _get_current_conversion_rate(self) -> float:
        """Get current conversion rate (last hour)"""
        # This would calculate actual conversion rate
        return 8.5
    
    async def _count_events_for_step(
        self, 
        step: Dict[str, Any], 
        start_date: datetime, 
        end_date: datetime
    ) -> int:
        """Count events for funnel step"""
        # This would query actual event counts
        return 100
    
    async def _aggregate_metrics(self):
        """Aggregate metrics for dashboard"""
        # This would calculate and store aggregated metrics
        pass
    
    async def _cleanup_expired_sessions(self):
        """Clean up expired sessions from cache"""
        # This would clean up old session data
        pass
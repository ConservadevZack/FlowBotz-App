"""
Analytics models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator
from .common import BaseModel, TimestampMixin, UUIDMixin, Money, GeoLocation

class EventType(str, Enum):
    """Analytics event types"""
    # User events
    USER_SIGNUP = "user_signup"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_PROFILE_UPDATE = "user_profile_update"
    
    # Design events
    DESIGN_CREATE = "design_create"
    DESIGN_EDIT = "design_edit"
    DESIGN_SAVE = "design_save"
    DESIGN_DELETE = "design_delete"
    DESIGN_SHARE = "design_share"
    DESIGN_DUPLICATE = "design_duplicate"
    DESIGN_EXPORT = "design_export"
    
    # AI events
    AI_GENERATION_START = "ai_generation_start"
    AI_GENERATION_COMPLETE = "ai_generation_complete"
    AI_GENERATION_FAILED = "ai_generation_failed"
    AI_STYLE_APPLIED = "ai_style_applied"
    
    # Commerce events
    PRODUCT_VIEW = "product_view"
    CART_ADD = "cart_add"
    CART_REMOVE = "cart_remove"
    CHECKOUT_START = "checkout_start"
    CHECKOUT_COMPLETE = "checkout_complete"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    
    # Engagement events
    PAGE_VIEW = "page_view"
    FEATURE_USE = "feature_use"
    TUTORIAL_COMPLETE = "tutorial_complete"
    SEARCH = "search"
    FILTER_APPLY = "filter_apply"
    
    # Social events
    DESIGN_LIKE = "design_like"
    DESIGN_COMMENT = "design_comment"
    USER_FOLLOW = "user_follow"
    DESIGN_REMIX = "design_remix"

class UserEvent(TimestampMixin, UUIDMixin):
    """Individual user event tracking"""
    user_id: Optional[UUID] = None  # Anonymous events allowed
    session_id: Optional[str] = None
    event_type: EventType
    event_name: str  # Specific event name
    
    # Event context
    page_url: Optional[str] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[GeoLocation] = None
    
    # Event properties
    properties: Dict[str, Any] = {}
    
    # Device info
    device_type: Optional[str] = None  # desktop, mobile, tablet
    os: Optional[str] = None
    browser: Optional[str] = None
    screen_resolution: Optional[str] = None
    
    # Campaign tracking
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None

class AnalyticsSession(TimestampMixin, UUIDMixin):
    """User session analytics"""
    user_id: Optional[UUID] = None
    session_id: str = Field(..., max_length=100)
    
    # Session info
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    
    # User context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[GeoLocation] = None
    
    # Device info
    device_type: str = "desktop"
    os: Optional[str] = None
    browser: Optional[str] = None
    screen_resolution: Optional[str] = None
    
    # Entry/exit
    entry_page: Optional[str] = None
    exit_page: Optional[str] = None
    referrer: Optional[str] = None
    
    # Engagement metrics
    page_views: int = 0
    events_triggered: int = 0
    designs_created: int = 0
    designs_edited: int = 0
    ai_generations: int = 0
    
    # Conversion tracking
    converted: bool = False
    conversion_type: Optional[str] = None
    conversion_value: Optional[Money] = None

class PageView(TimestampMixin, UUIDMixin):
    """Page view tracking"""
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    
    # Page info
    page_url: str
    page_title: Optional[str] = None
    referrer: Optional[str] = None
    
    # Timing
    time_on_page: Optional[int] = None  # seconds
    bounce: bool = False
    
    # Interaction
    scroll_depth: Optional[float] = None  # percentage
    clicks: int = 0
    
    # Context
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

class ConversionFunnel(TimestampMixin, UUIDMixin):
    """Conversion funnel tracking"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Funnel steps
    steps: List[Dict[str, Any]] = []
    
    # Time period
    period_start: datetime
    period_end: datetime
    
    # Metrics
    total_entries: int = 0
    step_metrics: Dict[str, Dict[str, int]] = {}
    conversion_rate: float = 0.0
    
    # Segmentation
    segment_metrics: Dict[str, Dict[str, Any]] = {}

class ABTestResult(TimestampMixin, UUIDMixin):
    """A/B test results"""
    test_name: str = Field(..., max_length=100)
    variant_name: str = Field(..., max_length=50)
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    
    # Test context
    test_start: datetime
    test_end: Optional[datetime] = None
    
    # Metrics
    converted: bool = False
    conversion_value: Optional[Money] = None
    events: List[str] = []
    
    # Metadata
    metadata: Dict[str, Any] = {}

class RevenueMetric(TimestampMixin, UUIDMixin):
    """Revenue tracking"""
    user_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    
    # Revenue data
    revenue: Money
    revenue_type: str = "one_time"  # one_time, subscription, refund
    
    # Product info
    product_id: Optional[str] = None
    product_category: Optional[str] = None
    quantity: int = 1
    
    # Attribution
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer: Optional[str] = None
    
    # Timing
    transaction_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Metadata
    metadata: Dict[str, Any] = {}

class PerformanceMetric(TimestampMixin, UUIDMixin):
    """Performance metrics tracking"""
    metric_type: str  # page_load, api_response, ai_generation
    metric_name: str
    
    # Performance data
    duration_ms: float
    status: str = "success"  # success, error, timeout
    
    # Context
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    url: Optional[str] = None
    
    # Technical details
    browser: Optional[str] = None
    device_type: Optional[str] = None
    connection_type: Optional[str] = None
    
    # Additional metrics
    memory_usage: Optional[int] = None
    cpu_usage: Optional[float] = None
    
    # Metadata
    metadata: Dict[str, Any] = {}

class CohortAnalysis(TimestampMixin, UUIDMixin):
    """Cohort analysis data"""
    cohort_name: str = Field(..., max_length=100)
    cohort_period: str  # signup_week, signup_month
    
    # Cohort definition
    period_start: datetime
    period_end: datetime
    total_users: int
    
    # Retention data
    retention_periods: Dict[str, Dict[str, int]] = {}
    
    # Metrics
    avg_revenue_per_user: Optional[Money] = None
    lifetime_value: Optional[Money] = None
    churn_rate: float = 0.0

class FeatureUsage(TimestampMixin, UUIDMixin):
    """Feature usage analytics"""
    feature_name: str = Field(..., max_length=100)
    feature_category: str = "general"
    
    # Usage metrics
    unique_users: int = 0
    total_uses: int = 0
    avg_uses_per_user: float = 0.0
    
    # User segments
    free_users: int = 0
    paid_users: int = 0
    enterprise_users: int = 0
    
    # Time period
    period_start: datetime
    period_end: datetime
    
    # Adoption metrics
    adoption_rate: float = 0.0
    retention_rate: float = 0.0

class UserJourney(TimestampMixin, UUIDMixin):
    """User journey tracking"""
    user_id: UUID
    journey_start: datetime
    journey_end: Optional[datetime] = None
    
    # Journey steps
    touchpoints: List[Dict[str, Any]] = []
    
    # Outcomes
    completed_goal: bool = False
    goal_type: Optional[str] = None
    goal_value: Optional[Money] = None
    
    # Metrics
    total_steps: int = 0
    duration_minutes: Optional[int] = None
    
class DashboardMetric(TimestampMixin, UUIDMixin):
    """Dashboard metric aggregations"""
    metric_name: str = Field(..., max_length=100)
    metric_type: str  # count, sum, average, percentage
    
    # Time period
    period_start: datetime
    period_end: datetime
    period_type: str = "daily"  # hourly, daily, weekly, monthly
    
    # Metric value
    value: float
    previous_value: Optional[float] = None
    change_percentage: Optional[float] = None
    
    # Dimensions
    dimensions: Dict[str, str] = {}
    
    # Status
    is_anomaly: bool = False
    threshold_breached: Optional[str] = None

class ExperimentResult(TimestampMixin, UUIDMixin):
    """Experiment results tracking"""
    experiment_name: str = Field(..., max_length=100)
    variant_name: str = Field(..., max_length=50)
    
    # Participants
    total_participants: int
    converted_participants: int
    conversion_rate: float
    
    # Statistical significance
    confidence_level: float = 0.95
    p_value: Optional[float] = None
    is_significant: bool = False
    
    # Revenue impact
    revenue_impact: Optional[Money] = None
    revenue_per_user: Optional[Money] = None
    
    # Time period
    experiment_start: datetime
    experiment_end: datetime

class SearchAnalytics(TimestampMixin, UUIDMixin):
    """Search analytics"""
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    
    # Search data
    query: str = Field(..., max_length=500)
    results_count: int = 0
    clicked_result: bool = False
    clicked_position: Optional[int] = None
    
    # Context
    search_context: str = "global"  # global, designs, templates, users
    filters_applied: Dict[str, Any] = {}
    
    # Timing
    search_duration_ms: Optional[int] = None
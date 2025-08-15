"""
Enterprise features models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator, EmailStr, HttpUrl
from .common import BaseModel, TimestampMixin, UUIDMixin, SoftDeleteMixin, Money

class WebhookEvent(str, Enum):
    """Webhook event types"""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    DESIGN_CREATED = "design.created"
    DESIGN_UPDATED = "design.updated"
    DESIGN_DELETED = "design.deleted"
    ORDER_CREATED = "order.created"
    ORDER_UPDATED = "order.updated"
    ORDER_COMPLETED = "order.completed"
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"
    TEAM_CREATED = "team.created"
    TEAM_UPDATED = "team.updated"
    MEMBER_ADDED = "member.added"
    MEMBER_REMOVED = "member.removed"

class WebhookStatus(str, Enum):
    """Webhook delivery status"""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    DISABLED = "disabled"

class APIUsagePeriod(str, Enum):
    """API usage period types"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class WhitelabelConfig(TimestampMixin, UUIDMixin):
    """White-label configuration"""
    organization_id: UUID
    name: str = Field(..., max_length=100)
    
    # Branding
    company_name: str = Field(..., max_length=100)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    
    # Color scheme
    primary_color: str = "#000000"
    secondary_color: str = "#ffffff"
    accent_color: str = "#007bff"
    
    # Custom domain
    domain: Optional[str] = None
    subdomain: str = Field(..., max_length=50)
    ssl_enabled: bool = True
    
    # Features
    enabled_features: List[str] = []
    disabled_features: List[str] = []
    
    # API configuration
    api_prefix: str = "/api/v1"
    rate_limits: Dict[str, int] = {}
    
    # Email templates
    email_templates: Dict[str, str] = {}
    
    # Footer and legal
    footer_text: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_approved: bool = False
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    @validator('subdomain')
    def validate_subdomain(cls, v):
        if not v.replace('-', '').isalnum():
            raise ValueError('Subdomain can only contain letters, numbers, and hyphens')
        return v.lower()

class WebhookEndpoint(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Webhook endpoint configuration"""
    organization_id: UUID
    name: str = Field(..., max_length=100)
    url: HttpUrl
    
    # Authentication
    secret: str = Field(..., max_length=255)  # For signature verification
    auth_header: Optional[str] = None
    auth_token: Optional[str] = None
    
    # Events
    subscribed_events: List[WebhookEvent] = []
    
    # Configuration
    timeout_seconds: int = Field(30, ge=5, le=120)
    max_retries: int = Field(3, ge=0, le=10)
    retry_backoff: str = "exponential"  # linear, exponential
    
    # Filtering
    filters: Dict[str, Any] = {}
    
    # Status
    is_active: bool = True
    last_delivery: Optional[datetime] = None
    last_success: Optional[datetime] = None
    consecutive_failures: int = 0
    
    # Statistics
    total_deliveries: int = 0
    successful_deliveries: int = 0
    failed_deliveries: int = 0

class WebhookDelivery(TimestampMixin, UUIDMixin):
    """Webhook delivery log"""
    endpoint_id: UUID
    event_type: WebhookEvent
    event_id: UUID
    
    # Request details
    request_url: str
    request_method: str = "POST"
    request_headers: Dict[str, str] = {}
    request_body: Dict[str, Any] = {}
    
    # Response details
    response_status: Optional[int] = None
    response_headers: Dict[str, str] = {}
    response_body: Optional[str] = None
    
    # Timing
    attempt_number: int = 1
    duration_ms: Optional[int] = None
    
    # Status
    status: WebhookStatus = WebhookStatus.PENDING
    error_message: Optional[str] = None
    
    # Retry info
    next_retry_at: Optional[datetime] = None
    max_retries_reached: bool = False

class APIUsage(TimestampMixin, UUIDMixin):
    """API usage tracking"""
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    api_key_id: Optional[UUID] = None
    
    # Time period
    period_start: datetime
    period_end: datetime
    period_type: APIUsagePeriod = APIUsagePeriod.DAILY
    
    # Usage metrics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    # Endpoint breakdown
    endpoint_usage: Dict[str, Dict[str, int]] = {}
    
    # Rate limiting
    rate_limit_hits: int = 0
    
    # Response times
    avg_response_time: Optional[float] = None
    max_response_time: Optional[float] = None
    
    # Data transfer
    bytes_sent: int = 0
    bytes_received: int = 0
    
    # Costs (if applicable)
    cost: Money = Money(amount=0.0, currency="USD")

class CustomDomain(TimestampMixin, UUIDMixin):
    """Custom domain management"""
    organization_id: UUID
    domain: str = Field(..., max_length=255)
    subdomain: Optional[str] = None
    
    # DNS configuration
    cname_target: Optional[str] = None
    dns_verified: bool = False
    dns_verification_token: Optional[str] = None
    
    # SSL configuration
    ssl_enabled: bool = False
    ssl_status: str = "pending"  # pending, active, failed, expired
    ssl_certificate_id: Optional[str] = None
    ssl_expires_at: Optional[datetime] = None
    
    # Status
    is_active: bool = False
    verified_at: Optional[datetime] = None
    
    # Configuration
    redirect_to_https: bool = True
    
    @validator('domain')
    def validate_domain(cls, v):
        import re
        if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$', v):
            raise ValueError('Invalid domain format')
        return v.lower()

class BrandingSettings(TimestampMixin, UUIDMixin):
    """Organization branding settings"""
    organization_id: UUID
    
    # Brand identity
    brand_name: str = Field(..., max_length=100)
    tagline: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    
    # Visual identity
    logo_light_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    logo_mark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    
    # Color palette
    primary_color: str = "#007bff"
    secondary_color: str = "#6c757d"
    success_color: str = "#28a745"
    warning_color: str = "#ffc107"
    danger_color: str = "#dc3545"
    info_color: str = "#17a2b8"
    
    # Typography
    primary_font: str = "Inter"
    secondary_font: str = "Inter"
    font_urls: List[str] = []
    
    # Custom CSS
    custom_css: Optional[str] = None
    
    # Email branding
    email_header_color: str = "#ffffff"
    email_footer_text: Optional[str] = None
    
    # Social links
    website_url: Optional[str] = None
    social_links: Dict[str, str] = {}

class IntegrationConfig(TimestampMixin, UUIDMixin):
    """Integration configurations"""
    organization_id: UUID
    integration_type: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    
    # Configuration
    config: Dict[str, Any] = {}
    credentials: Dict[str, str] = {}  # Encrypted
    
    # Webhooks
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    
    # Event subscriptions
    subscribed_events: List[str] = []
    
    # Rate limiting
    rate_limit: Optional[int] = None
    
    # Status
    is_active: bool = True
    is_verified: bool = False
    last_sync: Optional[datetime] = None
    sync_status: str = "idle"  # idle, syncing, error
    
    # Error handling
    error_count: int = 0
    last_error: Optional[str] = None

class OrganizationSettings(BaseModel):
    """Organization settings"""
    # General
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    currency: str = "USD"
    
    # Security
    enforce_2fa: bool = False
    password_policy: Dict[str, Any] = {}
    session_timeout: int = 86400  # seconds
    ip_whitelist: List[str] = []
    
    # Features
    enabled_features: List[str] = []
    feature_limits: Dict[str, int] = {}
    
    # API
    api_rate_limits: Dict[str, int] = {}
    api_cors_origins: List[str] = []
    
    # Notifications
    webhook_notifications: bool = True
    email_notifications: bool = True
    slack_notifications: bool = False
    
    # Data retention
    log_retention_days: int = 90
    backup_retention_days: int = 365
    
    # Compliance
    gdpr_enabled: bool = False
    ccpa_enabled: bool = False
    data_processing_agreement: bool = False

class Enterprise(TimestampMixin, UUIDMixin):
    """Enterprise organization"""
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    
    # Contact info
    contact_email: EmailStr
    contact_name: str = Field(..., max_length=100)
    phone: Optional[str] = None
    
    # Business info
    company_size: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    
    # Plan and billing
    plan: str = "enterprise"
    max_users: int = 1000
    max_teams: int = 100
    max_storage_gb: float = 1000.0
    
    # Features
    whitelabel_enabled: bool = False
    api_access_enabled: bool = True
    webhook_enabled: bool = True
    sso_enabled: bool = False
    
    # Configuration references
    whitelabel_config_id: Optional[UUID] = None
    branding_settings_id: Optional[UUID] = None
    
    # Settings
    settings: OrganizationSettings = OrganizationSettings()
    
    # Usage tracking
    current_users: int = 0
    current_teams: int = 0
    current_storage_gb: float = 0.0
    
    # Status
    is_active: bool = True
    is_trial: bool = True
    trial_ends_at: Optional[datetime] = None
    
    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if not v and 'name' in values:
            name = values['name']
            slug = name.lower().replace(' ', '-').replace('_', '-')
            import re
            slug = re.sub(r'[^a-z0-9-]', '', slug)
            return slug
        return v

class EnterpriseAuditLog(TimestampMixin, UUIDMixin):
    """Enterprise audit log"""
    organization_id: UUID
    user_id: Optional[UUID] = None
    
    # Action details
    action: str = Field(..., max_length=100)
    resource_type: str = Field(..., max_length=50)
    resource_id: Optional[str] = None
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    
    # Changes
    changes: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}
    
    # Classification
    severity: str = "info"  # info, warning, error, critical
    category: str = "general"  # auth, data, config, billing
    
    # Retention
    retention_days: int = 2555  # 7 years default
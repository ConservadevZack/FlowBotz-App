"""
Team and collaboration models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator, EmailStr
from .common import BaseModel, TimestampMixin, UUIDMixin, SoftDeleteMixin, Money

class TeamRole(str, Enum):
    """Team roles"""
    OWNER = "owner"
    ADMIN = "admin" 
    MANAGER = "manager"
    EDITOR = "editor"
    VIEWER = "viewer"
    GUEST = "guest"

class InvitationStatus(str, Enum):
    """Team invitation status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    REVOKED = "revoked"

class TeamPlan(str, Enum):
    """Team subscription plans"""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class Permission(BaseModel):
    """Permission definition"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    resource_type: str = "general"  # design, team, billing, etc.
    action: str  # create, read, update, delete, share, etc.

class Role(TimestampMixin, UUIDMixin):
    """Role definition with permissions"""
    name: str = Field(..., max_length=50)
    display_name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Permissions
    permissions: List[str] = []
    
    # System or custom role
    is_system_role: bool = True
    is_active: bool = True
    
    # Hierarchy
    level: int = 0  # Higher number = more permissions
    inherits_from: Optional[UUID] = None

class Team(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Main team model"""
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Ownership
    owner_id: UUID
    
    # Branding
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    brand_colors: List[str] = []
    
    # Subscription
    plan: TeamPlan = TeamPlan.FREE
    subscription_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    
    # Limits (based on plan)
    max_members: int = 5
    max_designs: int = 100
    max_storage_gb: float = 1.0
    max_ai_generations: int = 50
    
    # Usage tracking
    current_members: int = 1
    current_designs: int = 0
    current_storage_gb: float = 0.0
    current_ai_generations: int = 0
    
    # Settings
    settings: Dict[str, Any] = {}
    
    # Status
    is_active: bool = True
    is_verified: bool = False
    
    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if not v and 'name' in values:
            name = values['name']
            slug = name.lower().replace(' ', '-').replace('_', '-')
            import re
            slug = re.sub(r'[^a-z0-9-]', '', slug)
            return slug
        return v

class TeamCreate(BaseModel):
    """Team creation model"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    plan: TeamPlan = TeamPlan.FREE

class TeamUpdate(BaseModel):
    """Team update model"""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    brand_colors: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None

class TeamMembership(TimestampMixin, UUIDMixin):
    """Team membership"""
    team_id: UUID
    user_id: UUID
    role: TeamRole = TeamRole.VIEWER
    custom_role_id: Optional[UUID] = None
    
    # Invitation info
    invited_by: UUID
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    joined_at: Optional[datetime] = None
    
    # Access control
    permissions: List[str] = []
    permission_overrides: Dict[str, bool] = {}
    
    # Status
    is_active: bool = True
    last_activity: Optional[datetime] = None
    
    # Billing
    billable: bool = True

class TeamInvitation(TimestampMixin, UUIDMixin):
    """Team invitations"""
    team_id: UUID
    invited_by: UUID
    email: EmailStr
    role: TeamRole = TeamRole.VIEWER
    custom_role_id: Optional[UUID] = None
    
    # Invitation details
    message: Optional[str] = Field(None, max_length=500)
    permissions: List[str] = []
    
    # Status
    status: InvitationStatus = InvitationStatus.PENDING
    expires_at: datetime
    
    # Response
    responded_at: Optional[datetime] = None
    response_message: Optional[str] = None
    
    # Token for invitation link
    token: str = Field(..., max_length=255)

class TeamWorkspace(TimestampMixin, UUIDMixin):
    """Team workspace settings"""
    team_id: UUID
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Workspace settings
    default_permissions: List[str] = []
    approval_required: bool = False
    guest_access: bool = False
    
    # Brand kit
    brand_fonts: List[str] = []
    brand_colors: List[str] = []
    brand_assets: List[str] = []
    
    # Templates
    template_categories: List[str] = []
    approved_templates: List[UUID] = []
    
    # Integrations
    integrations: Dict[str, Any] = {}
    
    # Status
    is_active: bool = True

class TeamSettings(BaseModel):
    """Team settings"""
    # General settings
    auto_backup: bool = True
    backup_frequency: str = "daily"  # daily, weekly, manual
    
    # Collaboration
    real_time_collaboration: bool = True
    comment_notifications: bool = True
    design_approval_required: bool = False
    
    # Privacy
    allow_public_designs: bool = True
    allow_guest_collaboration: bool = False
    
    # AI settings
    ai_generation_enabled: bool = True
    ai_monthly_limit: Optional[int] = None
    approved_ai_models: List[str] = []
    
    # Export settings
    watermark_free_exports: bool = False
    high_res_exports: bool = True
    bulk_export_enabled: bool = False
    
    # Integrations
    slack_notifications: bool = False
    slack_webhook_url: Optional[str] = None
    
    # Brand consistency
    enforce_brand_colors: bool = False
    enforce_brand_fonts: bool = False
    require_approval_for_external_share: bool = False

class TeamActivity(TimestampMixin, UUIDMixin):
    """Team activity feed"""
    team_id: UUID
    user_id: UUID
    activity_type: str  # design_created, member_added, etc.
    
    # Activity details
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    
    # Related entities
    design_id: Optional[UUID] = None
    target_user_id: Optional[UUID] = None
    
    # Metadata
    metadata: Dict[str, Any] = {}
    
    # Visibility
    is_public: bool = True

class TeamUsage(TimestampMixin, UUIDMixin):
    """Team usage tracking"""
    team_id: UUID
    
    # Time period
    period_start: datetime
    period_end: datetime
    period_type: str = "monthly"
    
    # Usage metrics
    designs_created: int = 0
    designs_edited: int = 0
    ai_generations: int = 0
    exports: int = 0
    storage_used_gb: float = 0.0
    
    # Member metrics
    active_members: int = 0
    total_members: int = 0
    
    # Collaboration metrics
    shared_designs: int = 0
    comments: int = 0
    real_time_sessions: int = 0
    
    # Costs
    ai_cost: Money = Money(amount=0.0, currency="USD")
    storage_cost: Money = Money(amount=0.0, currency="USD")
    total_cost: Money = Money(amount=0.0, currency="USD")

class TeamBilling(TimestampMixin, UUIDMixin):
    """Team billing information"""
    team_id: UUID
    
    # Subscription
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_plan: TeamPlan = TeamPlan.FREE
    
    # Billing details
    billing_email: Optional[EmailStr] = None
    billing_name: Optional[str] = None
    tax_id: Optional[str] = None
    
    # Payment method
    default_payment_method: Optional[str] = None
    
    # Billing cycle
    billing_cycle: str = "monthly"  # monthly, yearly
    next_billing_date: Optional[datetime] = None
    
    # Credits and usage
    prepaid_credits: Money = Money(amount=0.0, currency="USD")
    usage_based_charges: Money = Money(amount=0.0, currency="USD")
    
    # Status
    payment_failed: bool = False
    grace_period_ends: Optional[datetime] = None

class TeamAuditLog(TimestampMixin, UUIDMixin):
    """Team audit log"""
    team_id: UUID
    user_id: Optional[UUID] = None
    
    # Action details
    action: str = Field(..., max_length=100)
    resource_type: str = Field(..., max_length=50)
    resource_id: Optional[str] = None
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Changes
    changes: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}
    
    # Severity
    severity: str = "info"  # info, warning, error

class TeamIntegration(TimestampMixin, UUIDMixin):
    """Team integrations"""
    team_id: UUID
    integration_type: str = Field(..., max_length=50)  # slack, discord, webhook
    name: str = Field(..., max_length=100)
    
    # Configuration
    config: Dict[str, Any] = {}
    webhook_url: Optional[str] = None
    
    # Events to notify
    events: List[str] = []
    
    # Status
    is_active: bool = True
    last_used: Optional[datetime] = None
    error_count: int = 0
    last_error: Optional[str] = None

class TeamBackup(TimestampMixin, UUIDMixin):
    """Team data backups"""
    team_id: UUID
    
    # Backup details
    backup_type: str = "full"  # full, incremental
    file_path: str
    file_size: int = 0
    
    # Content
    designs_count: int = 0
    members_count: int = 0
    
    # Status
    status: str = "completed"  # pending, completed, failed
    error_message: Optional[str] = None
    
    # Retention
    expires_at: datetime
    is_archived: bool = False
"""
User models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, EmailStr, validator, root_validator, model_validator
from .common import BaseModel, TimestampMixin, UUIDMixin, SoftDeleteMixin, ContactInfo, GeoLocation

class UserRole(str, Enum):
    """User roles in the system"""
    ADMIN = "admin"
    CREATOR = "creator"
    COLLABORATOR = "collaborator"
    VIEWER = "viewer"
    ENTERPRISE = "enterprise"

class SubscriptionTier(str, Enum):
    """Subscription tiers"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class UserPreferences(BaseModel):
    """User preferences and settings"""
    theme: str = "dark"  # light, dark, auto
    language: str = "en"
    timezone: str = "UTC"
    email_notifications: bool = True
    push_notifications: bool = True
    marketing_emails: bool = False
    auto_save_interval: int = Field(30, ge=10, le=300)  # seconds
    canvas_grid_enabled: bool = True
    canvas_snap_to_grid: bool = True
    default_canvas_size: Dict[str, int] = {"width": 800, "height": 600}
    ai_generation_settings: Dict[str, Any] = {}
    export_quality: str = "high"  # low, medium, high, ultra

class UserStats(BaseModel):
    """User statistics"""
    designs_created: int = 0
    designs_shared: int = 0
    ai_generations: int = 0
    orders_placed: int = 0
    total_spent: float = 0.0
    last_login: Optional[datetime] = None
    login_streak: int = 0
    achievements: List[str] = []

class UserProfile(TimestampMixin):
    """Extended user profile information"""
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    website: Optional[str] = None
    social_links: Dict[str, str] = {}
    location: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    skills: List[str] = []
    portfolio_public: bool = True
    show_contact_info: bool = False
    
class User(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Main user model"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    role: UserRole = UserRole.CREATOR
    status: UserStatus = UserStatus.PENDING_VERIFICATION
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    is_verified: bool = False
    email_verified: bool = False
    phone_verified: bool = False
    two_factor_enabled: bool = False
    
    # Profile and preferences
    profile: Optional[UserProfile] = None
    preferences: UserPreferences = UserPreferences()
    stats: UserStats = UserStats()
    
    # Subscription and billing
    subscription_id: Optional[str] = None
    customer_id: Optional[str] = None  # Stripe customer ID
    subscription_expires: Optional[datetime] = None
    trial_expires: Optional[datetime] = None
    
    # Security
    last_login: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    password_changed_at: Optional[datetime] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v.isalnum() and '_' not in v and '-' not in v:
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v.lower()
    
    @validator('email')
    def validate_email(cls, v):
        return v.lower()

class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    referral_code: Optional[str] = None
    marketing_consent: bool = False
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    """User update model"""
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    preferences: Optional[UserPreferences] = None

class UserLogin(BaseModel):
    """User login model"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str
    remember_me: bool = False
    
    @model_validator(mode='after')
    def validate_email_or_username(self):
        if not self.email and not self.username:
            raise ValueError('Either email or username is required')
        return self

class PasswordReset(BaseModel):
    """Password reset request"""
    email: EmailStr

class PasswordChange(BaseModel):
    """Password change model"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class TeamMember(TimestampMixin, UUIDMixin):
    """Team member association"""
    user_id: UUID
    team_id: UUID
    role: str = "member"
    permissions: List[str] = []
    invited_by: Optional[UUID] = None
    joined_at: Optional[datetime] = None
    is_active: bool = True

class TeamRole(BaseModel):
    """Team role definition"""
    name: str
    description: Optional[str] = None
    permissions: List[str]
    is_system_role: bool = False

class UserSession(TimestampMixin, UUIDMixin):
    """User session tracking"""
    user_id: UUID
    token_hash: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[GeoLocation] = None
    expires_at: datetime
    is_active: bool = True
    device_info: Dict[str, Any] = {}

class UserActivity(TimestampMixin, UUIDMixin):
    """User activity tracking"""
    user_id: UUID
    activity_type: str
    description: str
    metadata: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class UserNotification(TimestampMixin, UUIDMixin):
    """User notifications"""
    user_id: UUID
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    read: bool = False
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = {}

class UserAPIKey(TimestampMixin, UUIDMixin):
    """User API keys"""
    user_id: UUID
    name: str
    key_hash: str
    permissions: List[str] = []
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    rate_limit: Optional[int] = None
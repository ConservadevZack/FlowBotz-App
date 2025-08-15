"""
Design models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator, root_validator
from .common import BaseModel, TimestampMixin, UUIDMixin, SoftDeleteMixin, Money

class DesignStatus(str, Enum):
    """Design status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"

class DesignType(str, Enum):
    """Design types"""
    MOCKUP = "mockup"
    TEMPLATE = "template"
    CUSTOM = "custom"
    AI_GENERATED = "ai_generated"

class VisibilityLevel(str, Enum):
    """Design visibility levels"""
    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"
    UNLISTED = "unlisted"

class DesignCategory(TimestampMixin, UUIDMixin):
    """Design categories"""
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    
    @validator('slug')
    def validate_slug(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug can only contain letters, numbers, hyphens, and underscores')
        return v.lower()

class DesignTag(TimestampMixin, UUIDMixin):
    """Design tags"""
    name: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50)
    color: Optional[str] = None
    usage_count: int = 0
    
    @validator('slug')
    def validate_slug(cls, v):
        return v.lower().replace(' ', '-')

class DesignElement(BaseModel):
    """Design element (layer/object)"""
    id: str
    type: str  # text, image, shape, ai-generated
    name: Optional[str] = None
    x: float = 0
    y: float = 0
    width: float = 100
    height: float = 100
    rotation: float = 0
    opacity: float = 1.0
    visible: bool = True
    locked: bool = False
    z_index: int = 0
    
    # Element-specific properties
    properties: Dict[str, Any] = {}
    
    # Styling
    fill: Optional[str] = None
    stroke: Optional[str] = None
    stroke_width: float = 0
    
    # Filters and effects
    filters: List[Dict[str, Any]] = []
    effects: List[Dict[str, Any]] = []
    
    # Animation
    animations: List[Dict[str, Any]] = []

class DesignCanvas(BaseModel):
    """Design canvas properties"""
    width: int = Field(800, ge=100, le=10000)
    height: int = Field(600, ge=100, le=10000)
    background_color: str = "#ffffff"
    background_image: Optional[str] = None
    background_type: str = "color"  # color, gradient, image
    unit: str = "px"  # px, in, cm, mm
    dpi: int = 72
    bleed: Dict[str, float] = {"top": 0, "right": 0, "bottom": 0, "left": 0}

class DesignVersion(TimestampMixin, UUIDMixin):
    """Design version history"""
    design_id: UUID
    version_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    canvas: DesignCanvas
    elements: List[DesignElement] = []
    metadata: Dict[str, Any] = {}
    file_size: Optional[int] = None
    preview_url: Optional[str] = None
    created_by: UUID
    
class Design(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Main design model"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    slug: Optional[str] = None
    
    # Ownership and access
    owner_id: UUID
    team_id: Optional[UUID] = None
    visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    
    # Classification
    type: DesignType = DesignType.CUSTOM
    status: DesignStatus = DesignStatus.DRAFT
    category_id: Optional[UUID] = None
    tags: List[str] = []
    
    # Design content
    canvas: DesignCanvas = DesignCanvas()
    elements: List[DesignElement] = []
    current_version: int = 1
    
    # Media and files
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    file_urls: Dict[str, str] = {}  # Different formats/sizes
    
    # Metrics and engagement
    view_count: int = 0
    like_count: int = 0
    download_count: int = 0
    fork_count: int = 0
    
    # Collaboration
    is_collaborative: bool = False
    collaborators: List[UUID] = []
    
    # Monetization
    is_premium: bool = False
    price: Optional[Money] = None
    license_type: str = "standard"  # standard, extended, commercial
    
    # AI metadata
    ai_generated: bool = False
    ai_prompt: Optional[str] = None
    ai_model: Optional[str] = None
    ai_parameters: Dict[str, Any] = {}
    
    # Additional metadata
    metadata: Dict[str, Any] = {}
    file_size: Optional[int] = None
    dimensions: Dict[str, int] = {}
    color_palette: List[str] = []
    fonts_used: List[str] = []
    
    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if not v and 'title' in values:
            # Generate slug from title
            title = values['title']
            slug = title.lower().replace(' ', '-').replace('_', '-')
            # Remove special characters
            import re
            slug = re.sub(r'[^a-z0-9-]', '', slug)
            return slug
        return v

class DesignCreate(BaseModel):
    """Design creation model"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    type: DesignType = DesignType.CUSTOM
    visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    category_id: Optional[UUID] = None
    tags: List[str] = []
    canvas: Optional[DesignCanvas] = None
    team_id: Optional[UUID] = None
    template_id: Optional[UUID] = None  # If creating from template

class DesignUpdate(BaseModel):
    """Design update model"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    visibility: Optional[VisibilityLevel] = None
    status: Optional[DesignStatus] = None
    category_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    canvas: Optional[DesignCanvas] = None
    elements: Optional[List[DesignElement]] = None
    metadata: Optional[Dict[str, Any]] = None

class DesignTemplate(TimestampMixin, UUIDMixin):
    """Design templates"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category_id: UUID
    tags: List[str] = []
    
    # Template content
    canvas: DesignCanvas
    elements: List[DesignElement] = []
    
    # Media
    thumbnail_url: str
    preview_url: str
    
    # Metrics
    usage_count: int = 0
    rating: float = 0.0
    review_count: int = 0
    
    # Availability
    is_premium: bool = False
    price: Optional[Money] = None
    is_featured: bool = False
    is_active: bool = True
    
    # Creator info
    created_by: UUID
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None

class DesignShare(TimestampMixin, UUIDMixin):
    """Design sharing records"""
    design_id: UUID
    shared_by: UUID
    shared_with: Optional[UUID] = None  # Specific user
    share_type: str = "link"  # link, email, team
    permissions: List[str] = ["view"]  # view, comment, edit
    expires_at: Optional[datetime] = None
    password_hash: Optional[str] = None
    access_count: int = 0
    is_active: bool = True

class DesignComment(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Design comments"""
    design_id: UUID
    user_id: UUID
    parent_id: Optional[UUID] = None  # For replies
    content: str = Field(..., max_length=1000)
    position: Optional[Dict[str, float]] = None  # x, y coordinates
    element_id: Optional[str] = None  # Associated element
    is_resolved: bool = False
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None

class DesignLike(TimestampMixin, UUIDMixin):
    """Design likes"""
    design_id: UUID
    user_id: UUID

class DesignView(TimestampMixin):
    """Design view tracking"""
    design_id: UUID
    user_id: Optional[UUID] = None  # Anonymous views allowed
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    duration: Optional[int] = None  # Seconds
    
class DesignCollaboration(TimestampMixin, UUIDMixin):
    """Design collaboration settings"""
    design_id: UUID
    user_id: UUID
    role: str = "collaborator"  # viewer, commenter, editor, admin
    permissions: List[str] = []
    invited_by: UUID
    accepted_at: Optional[datetime] = None
    is_active: bool = True

class DesignExport(TimestampMixin, UUIDMixin):
    """Design export history"""
    design_id: UUID
    user_id: UUID
    format: str  # png, jpg, pdf, svg
    quality: str = "high"  # low, medium, high, ultra
    dimensions: Dict[str, int] = {}
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: str = "completed"  # pending, processing, completed, failed

class DesignFork(TimestampMixin, UUIDMixin):
    """Design forking/remixing"""
    original_design_id: UUID
    forked_design_id: UUID
    forked_by: UUID
    changes_description: Optional[str] = None
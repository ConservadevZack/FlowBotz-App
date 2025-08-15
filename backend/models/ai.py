"""
AI integration models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator, root_validator
from .common import BaseModel, TimestampMixin, UUIDMixin, Money

class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    REPLICATE = "replicate"
    STABILITY_AI = "stability_ai"
    MIDJOURNEY = "midjourney"
    ANTHROPIC = "anthropic"
    HUGGINGFACE = "huggingface"
    CUSTOM = "custom"

class AIModelType(str, Enum):
    """AI model types"""
    TEXT_TO_IMAGE = "text_to_image"
    IMAGE_TO_IMAGE = "image_to_image"
    TEXT_GENERATION = "text_generation"
    IMAGE_UPSCALE = "image_upscale"
    BACKGROUND_REMOVAL = "background_removal"
    STYLE_TRANSFER = "style_transfer"
    OBJECT_DETECTION = "object_detection"
    COLOR_PALETTE = "color_palette"

class AIModel(TimestampMixin, UUIDMixin):
    """AI model definitions"""
    name: str = Field(..., max_length=100)
    display_name: str = Field(..., max_length=100)
    provider: AIProvider
    model_id: str  # Provider-specific model ID
    type: AIModelType
    description: Optional[str] = None
    
    # Capabilities
    max_resolution: Dict[str, int] = {"width": 1024, "height": 1024}
    supported_formats: List[str] = ["png", "jpg"]
    aspect_ratios: List[str] = ["1:1", "16:9", "9:16", "4:3", "3:4"]
    
    # Parameters
    default_parameters: Dict[str, Any] = {}
    parameter_schema: Dict[str, Any] = {}
    
    # Pricing and limits
    cost_per_generation: Money = Money(amount=0.0, currency="USD")
    rate_limit_per_minute: int = 10
    rate_limit_per_hour: int = 100
    
    # Status
    is_active: bool = True
    is_beta: bool = False
    requires_subscription: bool = False
    minimum_tier: str = "free"

class AIStylePreset(TimestampMixin, UUIDMixin):
    """AI style presets"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    category: str = "general"
    
    # Style parameters
    prompt_template: str
    negative_prompt: Optional[str] = None
    parameters: Dict[str, Any] = {}
    
    # Model compatibility
    compatible_models: List[UUID] = []
    recommended_model: Optional[UUID] = None
    
    # Media
    thumbnail_url: Optional[str] = None
    example_images: List[str] = []
    
    # Metrics
    usage_count: int = 0
    rating: float = 0.0
    
    # Availability
    is_premium: bool = False
    is_featured: bool = False
    is_active: bool = True
    created_by: Optional[UUID] = None  # System or user-created

class AIGenerationRequest(BaseModel):
    """AI generation request"""
    model_id: UUID
    prompt: str = Field(..., max_length=2000)
    negative_prompt: Optional[str] = Field(None, max_length=1000)
    
    # Generation parameters
    width: int = Field(1024, ge=64, le=2048)
    height: int = Field(1024, ge=64, le=2048)
    steps: int = Field(20, ge=1, le=100)
    guidance_scale: float = Field(7.5, ge=1.0, le=20.0)
    seed: Optional[int] = None
    
    # Advanced parameters
    scheduler: Optional[str] = None
    style_preset: Optional[UUID] = None
    
    # Input image (for img2img)
    input_image_url: Optional[str] = None
    input_image_strength: Optional[float] = Field(None, ge=0.0, le=1.0)
    
    # Batch settings
    num_images: int = Field(1, ge=1, le=4)
    
    # Output preferences
    output_format: str = "png"
    quality: int = Field(95, ge=1, le=100)
    
    # Metadata
    metadata: Dict[str, Any] = {}

class AIGenerationStatus(str, Enum):
    """AI generation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AIGenerationResponse(TimestampMixin, UUIDMixin):
    """AI generation response"""
    user_id: UUID
    request_id: Optional[str] = None  # Provider request ID
    model_id: UUID
    
    # Request details
    prompt: str
    parameters: Dict[str, Any] = {}
    
    # Status and timing
    status: AIGenerationStatus = AIGenerationStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None  # seconds
    
    # Results
    output_urls: List[str] = []
    metadata: Dict[str, Any] = {}
    
    # Error handling
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    retry_count: int = 0
    
    # Cost tracking
    cost: Optional[Money] = None
    tokens_used: Optional[int] = None

class AIBatchRequest(TimestampMixin, UUIDMixin):
    """Batch AI generation request"""
    user_id: UUID
    name: Optional[str] = None
    description: Optional[str] = None
    
    # Batch settings
    requests: List[AIGenerationRequest]
    priority: int = Field(5, ge=1, le=10)
    
    # Status tracking
    status: str = "pending"  # pending, processing, completed, failed, cancelled
    total_requests: int
    completed_requests: int = 0
    failed_requests: int = 0
    
    # Results
    results: List[UUID] = []  # AIGenerationResponse IDs
    
    # Cost
    estimated_cost: Optional[Money] = None
    actual_cost: Optional[Money] = None

class AIUsageStats(TimestampMixin, UUIDMixin):
    """AI usage statistics"""
    user_id: Optional[UUID] = None  # None for system-wide stats
    model_id: Optional[UUID] = None  # None for all models
    
    # Time period
    period_start: datetime
    period_end: datetime
    period_type: str = "daily"  # hourly, daily, weekly, monthly
    
    # Usage metrics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    # Performance metrics
    avg_processing_time: Optional[float] = None
    min_processing_time: Optional[float] = None
    max_processing_time: Optional[float] = None
    
    # Cost metrics
    total_cost: Money = Money(amount=0.0, currency="USD")
    avg_cost_per_request: Optional[Money] = None
    
    # Popular parameters
    popular_styles: List[Dict[str, Any]] = []
    popular_dimensions: List[Dict[str, int]] = []
    
class AIPromptEnhancement(TimestampMixin, UUIDMixin):
    """AI prompt enhancement"""
    original_prompt: str
    enhanced_prompt: str
    enhancement_type: str = "auto"  # auto, style, quality, detail
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None
    suggestions: List[str] = []
    user_id: Optional[UUID] = None

class AIModelPerformance(TimestampMixin, UUIDMixin):
    """AI model performance tracking"""
    model_id: UUID
    
    # Performance metrics
    avg_processing_time: float
    success_rate: float
    error_rate: float
    
    # Quality metrics
    user_rating: Optional[float] = None
    quality_score: Optional[float] = None
    
    # Usage metrics
    total_generations: int
    unique_users: int
    
    # Time period
    period_start: datetime
    period_end: datetime

class AIFeedback(TimestampMixin, UUIDMixin):
    """User feedback on AI generations"""
    generation_id: UUID
    user_id: UUID
    
    # Ratings (1-5 scale)
    overall_rating: int = Field(..., ge=1, le=5)
    prompt_accuracy: Optional[int] = Field(None, ge=1, le=5)
    image_quality: Optional[int] = Field(None, ge=1, le=5)
    style_adherence: Optional[int] = Field(None, ge=1, le=5)
    
    # Feedback
    comments: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = []
    
    # Actions
    liked: bool = False
    saved: bool = False
    shared: bool = False
    used_in_design: bool = False

class AIQueue(TimestampMixin, UUIDMixin):
    """AI generation queue management"""
    user_id: UUID
    request_data: Dict[str, Any]
    priority: int = Field(5, ge=1, le=10)
    
    # Queue status
    status: str = "queued"  # queued, processing, completed, failed
    assigned_worker: Optional[str] = None
    started_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    
    # Retry logic
    max_retries: int = 3
    retry_count: int = 0
    last_error: Optional[str] = None

class AIAPIKey(TimestampMixin, UUIDMixin):
    """AI provider API keys"""
    provider: AIProvider
    key_name: str
    encrypted_key: str  # Encrypted API key
    
    # Usage tracking
    requests_used: int = 0
    monthly_limit: Optional[int] = None
    cost_limit: Optional[Money] = None
    
    # Status
    is_active: bool = True
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
class AIPromptLibrary(TimestampMixin, UUIDMixin):
    """Shared prompt library"""
    title: str = Field(..., max_length=200)
    prompt: str
    category: str = "general"
    tags: List[str] = []
    
    # Metadata
    author_id: Optional[UUID] = None
    is_public: bool = False
    usage_count: int = 0
    rating: float = 0.0
    
    # AI model compatibility
    compatible_models: List[UUID] = []
    recommended_parameters: Dict[str, Any] = {}
    
    # Examples
    example_outputs: List[str] = []
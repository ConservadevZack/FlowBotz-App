"""
Print-on-Demand (POD) models for FlowBotz backend
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import Field, validator, root_validator
from .common import BaseModel, TimestampMixin, UUIDMixin, SoftDeleteMixin, Money, Address

class PODProvider(str, Enum):
    """Supported POD providers"""
    PRINTFUL = "printful"
    GOOTEN = "gooten"
    SCALABLEPRESS = "scalablepress"
    TEESPRING = "teespring"
    PRINTIFY = "printify"
    CUSTOM = "custom"

class ProductStatus(str, Enum):
    """Product status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"

class OrderStatus(str, Enum):
    """Order status"""
    PENDING = "pending"
    PROCESSING = "processing"
    PRINTED = "printed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    FAILED = "failed"

class ProductCategory(TimestampMixin, UUIDMixin):
    """Product categories"""
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    
    # Display
    icon: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    
    # Status
    is_active: bool = True
    is_featured: bool = False
    
    @validator('slug')
    def validate_slug(cls, v):
        return v.lower().replace(' ', '-')

class ProductVariant(BaseModel):
    """Product variant (size, color, etc.)"""
    id: str
    name: str
    sku: Optional[str] = None
    
    # Attributes
    size: Optional[str] = None
    color: Optional[str] = None
    color_code: Optional[str] = None
    material: Optional[str] = None
    
    # Pricing
    base_price: Money
    retail_price: Money
    margin: float = 0.0
    
    # Availability
    in_stock: bool = True
    stock_quantity: Optional[int] = None
    
    # Physical properties
    weight: Optional[float] = None  # grams
    dimensions: Dict[str, float] = {}  # cm
    
    # Print areas
    print_areas: List[Dict[str, Any]] = []
    
    # Provider specific
    provider_variant_id: Optional[str] = None
    provider_data: Dict[str, Any] = {}

class Product(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Main product model"""
    name: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    
    # Classification
    category_id: UUID
    subcategory_id: Optional[UUID] = None
    tags: List[str] = []
    
    # Provider info
    provider: PODProvider
    provider_product_id: str
    provider_data: Dict[str, Any] = {}
    
    # Variants
    variants: List[ProductVariant] = []
    default_variant_id: Optional[str] = None
    
    # Images and media
    images: List[str] = []
    mockup_templates: List[str] = []
    size_guide_url: Optional[str] = None
    
    # Pricing
    base_price_range: Dict[str, Money] = {}  # min/max
    retail_price_range: Dict[str, Money] = {}
    
    # Properties
    brand: Optional[str] = None
    material: Optional[str] = None
    care_instructions: Optional[str] = None
    
    # Metrics
    popularity_score: float = 0.0
    average_rating: float = 0.0
    review_count: int = 0
    order_count: int = 0
    
    # Status
    status: ProductStatus = ProductStatus.ACTIVE
    is_featured: bool = False
    is_new: bool = False
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if not v and 'name' in values:
            name = values['name']
            slug = name.lower().replace(' ', '-').replace('_', '-')
            import re
            slug = re.sub(r'[^a-z0-9-]', '', slug)
            return slug
        return v

class ProductMockup(TimestampMixin, UUIDMixin):
    """Product mockup templates"""
    product_id: UUID
    variant_id: str
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Mockup data
    template_url: str
    preview_url: str
    print_areas: List[Dict[str, Any]] = []
    
    # Transform properties
    perspective: Optional[Dict[str, float]] = None
    overlay_settings: Dict[str, Any] = {}
    
    # Usage
    usage_count: int = 0
    is_featured: bool = False
    is_active: bool = True

class Inventory(TimestampMixin, UUIDMixin):
    """Inventory tracking"""
    product_id: UUID
    variant_id: str
    provider: PODProvider
    
    # Stock levels
    quantity_available: int = 0
    quantity_reserved: int = 0
    restock_threshold: int = 5
    
    # Pricing
    current_price: Money
    price_history: List[Dict[str, Any]] = []
    
    # Status
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    is_tracking: bool = True
    
    # Alerts
    low_stock_alert: bool = False
    out_of_stock_alert: bool = False

class OrderItem(BaseModel):
    """Order item"""
    product_id: UUID
    variant_id: str
    design_id: Optional[UUID] = None
    
    # Product details
    product_name: str
    variant_name: str
    sku: Optional[str] = None
    
    # Quantity and pricing
    quantity: int = Field(..., ge=1)
    unit_price: Money
    total_price: Money
    
    # Design/customization
    design_url: Optional[str] = None
    design_data: Dict[str, Any] = {}
    personalization: Dict[str, Any] = {}
    
    # Provider info
    provider_item_id: Optional[str] = None
    provider_data: Dict[str, Any] = {}
    
    # Fulfillment
    status: OrderStatus = OrderStatus.PENDING
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    
    @validator('total_price')
    def validate_total_price(cls, v, values):
        if 'unit_price' in values and 'quantity' in values:
            expected = Money(
                amount=values['unit_price'].amount * values['quantity'],
                currency=values['unit_price'].currency
            )
            if abs(v.amount - expected.amount) > 0.01:
                raise ValueError('Total price must equal unit price × quantity')
        return v

class Order(TimestampMixin, UUIDMixin):
    """Main order model"""
    user_id: UUID
    order_number: str = Field(..., max_length=50)
    
    # Order details
    items: List[OrderItem]
    status: OrderStatus = OrderStatus.PENDING
    
    # Pricing
    subtotal: Money
    shipping_cost: Money = Money(amount=0.0, currency="USD")
    tax_amount: Money = Money(amount=0.0, currency="USD")
    discount_amount: Money = Money(amount=0.0, currency="USD")
    total_amount: Money
    
    # Customer info
    customer_email: str
    customer_phone: Optional[str] = None
    
    # Shipping
    shipping_address: Address
    billing_address: Optional[Address] = None
    shipping_method: str = "standard"
    
    # Payment
    payment_intent_id: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: str = "pending"
    
    # Fulfillment
    provider_orders: Dict[str, Any] = {}  # Provider-specific order IDs
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    
    # Tracking
    tracking_numbers: List[str] = []
    tracking_urls: List[str] = []
    
    # Metadata
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}
    
    @validator('order_number', pre=True, always=True)
    def generate_order_number(cls, v):
        if not v:
            import time
            import random
            timestamp = int(time.time())
            random_num = random.randint(1000, 9999)
            return f"FB-{timestamp}-{random_num}"
        return v

class ShippingRate(TimestampMixin, UUIDMixin):
    """Shipping rates"""
    provider: PODProvider
    method: str = Field(..., max_length=50)  # standard, express, overnight
    name: str = Field(..., max_length=100)
    
    # Geographic coverage
    countries: List[str] = ["US"]
    regions: List[str] = []
    
    # Pricing
    base_rate: Money
    per_item_rate: Money = Money(amount=0.0, currency="USD")
    weight_based: bool = False
    weight_rates: List[Dict[str, Any]] = []
    
    # Timing
    estimated_days_min: int = 3
    estimated_days_max: int = 7
    cutoff_time: Optional[str] = None  # Time in provider's timezone
    
    # Restrictions
    min_order_value: Optional[Money] = None
    max_weight: Optional[float] = None  # grams
    max_dimensions: Optional[Dict[str, float]] = None  # cm
    
    # Status
    is_active: bool = True

class ProductReview(TimestampMixin, UUIDMixin, SoftDeleteMixin):
    """Product reviews"""
    product_id: UUID
    user_id: UUID
    order_id: Optional[UUID] = None
    
    # Review content
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, max_length=2000)
    
    # Review aspects
    quality_rating: Optional[int] = Field(None, ge=1, le=5)
    fit_rating: Optional[int] = Field(None, ge=1, le=5)
    design_rating: Optional[int] = Field(None, ge=1, le=5)
    
    # Status
    is_verified_purchase: bool = False
    is_approved: bool = True
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Engagement
    helpful_count: int = 0
    not_helpful_count: int = 0
    
    # Images
    image_urls: List[str] = []

class ProductAnalytics(TimestampMixin, UUIDMixin):
    """Product analytics"""
    product_id: UUID
    
    # Time period
    period_start: datetime
    period_end: datetime
    period_type: str = "daily"
    
    # View metrics
    page_views: int = 0
    unique_viewers: int = 0
    
    # Engagement metrics
    add_to_cart: int = 0
    mockup_generations: int = 0
    design_applications: int = 0
    
    # Conversion metrics
    orders: int = 0
    units_sold: int = 0
    revenue: Money = Money(amount=0.0, currency="USD")
    conversion_rate: float = 0.0
    
    # Review metrics
    new_reviews: int = 0
    average_rating: float = 0.0

class BulkOrder(TimestampMixin, UUIDMixin):
    """Bulk order processing"""
    user_id: UUID
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Order items
    order_items: List[Dict[str, Any]] = []
    total_items: int = 0
    
    # Status
    status: str = "pending"  # pending, processing, completed, failed
    processed_items: int = 0
    failed_items: int = 0
    
    # Results
    created_orders: List[UUID] = []
    error_log: List[str] = []
    
    # Pricing
    estimated_total: Money = Money(amount=0.0, currency="USD")
    actual_total: Money = Money(amount=0.0, currency="USD")
    
    # Processing info
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class PODWebhook(TimestampMixin, UUIDMixin):
    """POD provider webhooks"""
    provider: PODProvider
    webhook_type: str  # order_update, inventory_update, etc.
    order_id: Optional[UUID] = None
    
    # Webhook data
    provider_order_id: Optional[str] = None
    event_data: Dict[str, Any] = {}
    
    # Processing
    processed: bool = False
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
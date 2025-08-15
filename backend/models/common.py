"""
Common base models and utilities for FlowBotz backend
"""

from typing import Any, Dict, List, Optional, Union, Generic, TypeVar
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from pydantic import BaseModel as PydanticBaseModel, Field, validator, root_validator
from pydantic.generics import GenericModel

T = TypeVar('T')

class BaseModel(PydanticBaseModel):
    """Base model with common configuration"""
    
    class Config:
        orm_mode = True
        use_enum_values = True
        validate_assignment = True
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }

class TimestampMixin(BaseModel):
    """Mixin for models that need timestamp fields"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UUIDMixin(BaseModel):
    """Mixin for models that need UUID primary key"""
    id: UUID = Field(default_factory=uuid4, description="Unique identifier")

class SoftDeleteMixin(BaseModel):
    """Mixin for models that support soft deletion"""
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

class PaginationParams(BaseModel):
    """Standard pagination parameters"""
    page: int = Field(1, ge=1, description="Page number (1-based)")
    limit: int = Field(20, ge=1, le=100, description="Number of items per page")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class SortParams(BaseModel):
    """Standard sorting parameters"""
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: SortOrder = Field(SortOrder.DESC, description="Sort order")

class FilterParams(BaseModel):
    """Base filter parameters"""
    search: Optional[str] = Field(None, description="Search query")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")

class ResponseModel(GenericModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None

class PaginatedResponse(GenericModel, Generic[T]):
    """Paginated response wrapper"""
    success: bool = True
    data: List[T] = []
    pagination: Dict[str, Any] = {}
    meta: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    error: str
    code: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ValidationError(BaseModel):
    """Validation error details"""
    field: str
    message: str
    code: str

class SecurityContext(BaseModel):
    """Security context for requests"""
    user_id: UUID
    role: str
    permissions: List[str]
    team_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLog(TimestampMixin, UUIDMixin):
    """Audit log entry"""
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    severity: str = "info"  # info, warning, error, critical

class FileUpload(BaseModel):
    """File upload metadata"""
    filename: str
    content_type: str
    size: int
    url: str
    storage_provider: str = "supabase"
    metadata: Dict[str, Any] = {}

class GeoLocation(BaseModel):
    """Geographic location data"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

class Currency(str, Enum):
    """Supported currencies"""
    USD = "USD"
    EUR = "EUR" 
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"

class Money(BaseModel):
    """Money amount with currency"""
    amount: float = Field(..., ge=0)
    currency: Currency = Currency.USD
    
    @validator('amount')
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        # Round to 2 decimal places for currency
        return round(v, 2)

class ContactInfo(BaseModel):
    """Contact information"""
    email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    phone: Optional[str] = None
    website: Optional[str] = None
    
class Address(BaseModel):
    """Physical address"""
    street_address: str
    street_address_2: Optional[str] = None
    city: str
    state_province: str
    postal_code: str
    country: str = "US"
    
class HealthStatus(str, Enum):
    """System health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"

class HealthCheck(BaseModel):
    """Health check response"""
    status: HealthStatus
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str
    uptime_seconds: float
    checks: Dict[str, Any] = {}

class APIKey(TimestampMixin, UUIDMixin):
    """API key model"""
    name: str
    key_hash: str  # Hashed version of the key
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    permissions: List[str] = []
    rate_limit: Optional[int] = None
    
class RateLimitInfo(BaseModel):
    """Rate limit information"""
    limit: int
    remaining: int
    reset_at: datetime
    window_seconds: int
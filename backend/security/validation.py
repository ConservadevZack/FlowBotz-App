"""
Input validation and sanitization for FlowBotz API
Comprehensive validation to prevent injection attacks and ensure data integrity
"""
from pydantic import BaseModel, EmailStr, validator, Field, HttpUrl
from typing import Optional, Dict, Any, List, Union
import re
import html
import urllib.parse
from datetime import datetime
from enum import Enum
import base64


class SanitizedStr(str):
    """String type that automatically sanitizes HTML and dangerous characters"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('String required')
        
        # HTML escape
        v = html.escape(v, quote=True)
        
        # Remove potential SQL injection patterns
        dangerous_patterns = [
            r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+",
            r"(?i)(or|and)\s+\d+\s*=\s*\d+",
            r"['\"];?\s*(drop|delete|insert|update|select)",
            r"--\s*",  # SQL comments
            r"/\*.*?\*/",  # SQL block comments
        ]
        
        for pattern in dangerous_patterns:
            v = re.sub(pattern, '', v)
        
        # Remove JavaScript protocols
        v = re.sub(r'javascript:', '', v, flags=re.IGNORECASE)
        v = re.sub(r'vbscript:', '', v, flags=re.IGNORECASE)
        
        return cls(v)


class SafeHTML(str):
    """HTML content that's been sanitized for XSS prevention"""
    
    ALLOWED_TAGS = {
        'p', 'br', 'strong', 'em', 'u', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code'
    }
    
    ALLOWED_ATTRIBUTES = {
        'class', 'id'
    }
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('String required')
        
        # Remove dangerous tags and attributes
        # In production, use a library like bleach for proper HTML sanitization
        import re
        
        # Remove script tags and their content
        v = re.sub(r'<script[^>]*>.*?</script>', '', v, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove dangerous attributes
        dangerous_attrs = [r'on\w+', 'javascript:', 'vbscript:', 'data:', 'style']
        for attr in dangerous_attrs:
            v = re.sub(f'{attr}[^>]*', '', v, flags=re.IGNORECASE)
        
        # Remove dangerous tags
        dangerous_tags = ['iframe', 'object', 'embed', 'link', 'meta', 'form', 'input']
        for tag in dangerous_tags:
            v = re.sub(f'<{tag}[^>]*>.*?</{tag}>', '', v, flags=re.IGNORECASE | re.DOTALL)
            v = re.sub(f'<{tag}[^>]*/?>', '', v, flags=re.IGNORECASE)
        
        return cls(v)


class SecureFileName(str):
    """Filename that's been sanitized for filesystem safety"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('String required')
        
        # Remove path traversal attempts
        v = v.replace('..', '').replace('/', '').replace('\\', '')
        
        # Remove dangerous characters
        v = re.sub(r'[<>:"|?*]', '', v)
        
        # Ensure it's not empty and has reasonable length
        v = v.strip()
        if not v:
            raise ValueError('Filename cannot be empty')
        if len(v) > 255:
            raise ValueError('Filename too long (max 255 characters)')
        
        return cls(v)


class PaymentAmountField(int):
    """Validated payment amount in cents"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not isinstance(v, (int, float)):
            raise TypeError('Number required')
        
        v = int(v)
        
        if v < 50:  # Minimum $0.50
            raise ValueError('Amount too small (minimum $0.50)')
        if v > 100000000:  # Maximum $1M
            raise ValueError('Amount too large (maximum $1,000,000)')
        
        return cls(v)


# Validated request models for all API endpoints

class ValidatedChatMessage(BaseModel):
    """Validated chat message"""
    role: str = Field(..., pattern=r'^(user|assistant|system)$')
    content: SanitizedStr = Field(..., max_length=10000)
    timestamp: Optional[datetime] = None
    
    @validator('content')
    def validate_content_length(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('Message content cannot be empty')
        return v


class ValidatedChatRequest(BaseModel):
    """Validated chat completion request"""
    messages: List[ValidatedChatMessage] = Field(..., min_items=1, max_items=50)
    model: str = Field(default="gpt-3.5-turbo", pattern=r'^[a-zA-Z0-9\-\.]+$')
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=1, le=4000)
    user_id: Optional[str] = None


class ValidatedImageGenerationRequest(BaseModel):
    """Validated image generation request"""
    prompt: SanitizedStr = Field(..., min_length=3, max_length=2000)
    model: str = Field(default="stable-diffusion", pattern=r'^[a-zA-Z0-9\-\.]+$')
    size: str = Field(default="1024x1024", pattern=r'^\d{3,4}x\d{3,4}$')
    style: str = Field(default="photorealistic", max_length=50)
    negative_prompt: Optional[SanitizedStr] = Field(None, max_length=1000)
    
    @validator('size')
    def validate_size(cls, v):
        width, height = map(int, v.split('x'))
        max_dimension = 2048
        min_dimension = 256
        
        if width > max_dimension or height > max_dimension:
            raise ValueError(f'Image dimensions too large (max {max_dimension}x{max_dimension})')
        if width < min_dimension or height < min_dimension:
            raise ValueError(f'Image dimensions too small (min {min_dimension}x{min_dimension})')
        
        return v


class ValidatedPaymentIntentRequest(BaseModel):
    """Validated payment intent request"""
    amount: PaymentAmountField
    currency: str = Field(default="usd", pattern=r'^[a-z]{3}$')
    metadata: Optional[Dict[str, SanitizedStr]] = Field(default_factory=dict, max_items=20)
    automatic_payment_methods: bool = True
    
    @validator('metadata')
    def validate_metadata(cls, v):
        if v:
            for key, value in v.items():
                if len(key) > 100:
                    raise ValueError('Metadata key too long (max 100 characters)')
                if len(str(value)) > 500:
                    raise ValueError('Metadata value too long (max 500 characters)')
        return v


class ValidatedSubscriptionRequest(BaseModel):
    """Validated subscription request"""
    price_id: str = Field(..., pattern=r'^price_[a-zA-Z0-9_]+$')
    metadata: Optional[Dict[str, SanitizedStr]] = Field(default_factory=dict, max_items=10)
    trial_period_days: Optional[int] = Field(None, ge=1, le=365)


class ValidatedProductPurchaseRequest(BaseModel):
    """Validated product purchase request"""
    product_id: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]+$', max_length=100)
    variant_id: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]+$', max_length=100)
    quantity: int = Field(default=1, ge=1, le=100)
    design_url: HttpUrl
    customer_email: EmailStr
    shipping_address: 'ValidatedAddress'


class ValidatedAddress(BaseModel):
    """Validated shipping address"""
    name: SanitizedStr = Field(..., min_length=1, max_length=100)
    address_line_1: SanitizedStr = Field(..., min_length=5, max_length=200)
    address_line_2: Optional[SanitizedStr] = Field(None, max_length=200)
    city: SanitizedStr = Field(..., min_length=1, max_length=100)
    state: SanitizedStr = Field(..., min_length=2, max_length=50)
    postal_code: str = Field(..., pattern=r'^[a-zA-Z0-9\s\-]{3,20}$')
    country: str = Field(..., pattern=r'^[A-Z]{2}$')  # ISO country code
    phone: Optional[str] = Field(None, pattern=r'^\+?[\d\s\-\(\)]{10,20}$')


class ValidatedWorkflowRequest(BaseModel):
    """Validated workflow creation/update request"""
    name: SanitizedStr = Field(..., min_length=1, max_length=200)
    description: Optional[SafeHTML] = Field(None, max_length=2000)
    config: Dict[str, Any] = Field(..., max_items=50)
    tags: Optional[List[SanitizedStr]] = Field(None, max_items=20)
    is_active: bool = True
    schedule: Optional[str] = Field(None, pattern=r'^(\*|[0-5]?\d)(\s+(\*|[0-5]?\d)){4}$')  # Cron format
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            for tag in v:
                if len(tag) > 50:
                    raise ValueError('Tag too long (max 50 characters)')
        return v
    
    @validator('config')
    def validate_config(cls, v):
        # Basic validation for workflow configuration
        max_depth = 10
        
        def check_depth(obj, depth=0):
            if depth > max_depth:
                raise ValueError('Configuration too deeply nested')
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if not isinstance(key, str) or len(key) > 100:
                        raise ValueError('Invalid configuration key')
                    check_depth(value, depth + 1)
            elif isinstance(obj, list):
                if len(obj) > 1000:
                    raise ValueError('Configuration array too large')
                for item in obj:
                    check_depth(item, depth + 1)
            elif isinstance(obj, str) and len(obj) > 10000:
                raise ValueError('Configuration string value too long')
        
        check_depth(v)
        return v


class ValidatedFileUpload(BaseModel):
    """Validated file upload request"""
    filename: SecureFileName
    content_type: str = Field(..., pattern=r'^[a-zA-Z0-9\-\+/]+$')
    size: int = Field(..., ge=1, le=50*1024*1024)  # Max 50MB
    data: str  # Base64 encoded
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = {
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain', 'application/json'
        }
        if v not in allowed_types:
            raise ValueError(f'Unsupported file type: {v}')
        return v
    
    @validator('data')
    def validate_base64_data(cls, v):
        try:
            decoded = base64.b64decode(v)
            if len(decoded) == 0:
                raise ValueError('Empty file data')
        except Exception:
            raise ValueError('Invalid base64 data')
        return v


class ValidatedWebhookPayload(BaseModel):
    """Validated webhook payload"""
    event_type: str = Field(..., pattern=r'^[a-zA-Z0-9\.\-_]+$', max_length=100)
    timestamp: datetime
    data: Dict[str, Any] = Field(..., max_items=100)
    source: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]+$', max_length=50)
    signature: Optional[str] = Field(None, max_length=1000)
    
    @validator('data')
    def validate_webhook_data(cls, v):
        # Prevent excessively large webhook payloads
        import json
        json_str = json.dumps(v)
        if len(json_str) > 1024 * 1024:  # 1MB limit
            raise ValueError('Webhook payload too large')
        return v


class ValidatedPasswordReset(BaseModel):
    """Validated password reset request"""
    email: EmailStr
    token: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]{32,128}$')
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class ValidatedSearchRequest(BaseModel):
    """Validated search request"""
    query: SanitizedStr = Field(..., min_length=1, max_length=500)
    filters: Optional[Dict[str, Union[str, List[str]]]] = Field(None, max_items=20)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    sort_by: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9_]+$', max_length=50)
    sort_order: str = Field(default="desc", pattern=r'^(asc|desc)$')
    
    @validator('filters')
    def validate_filters(cls, v):
        if v:
            for key, value in v.items():
                if not re.match(r'^[a-zA-Z0-9_]+$', key):
                    raise ValueError(f'Invalid filter key: {key}')
                
                if isinstance(value, list):
                    if len(value) > 100:
                        raise ValueError(f'Too many values for filter {key}')
                    for item in value:
                        if not isinstance(item, str) or len(item) > 200:
                            raise ValueError(f'Invalid filter value for {key}')
                elif isinstance(value, str):
                    if len(value) > 200:
                        raise ValueError(f'Filter value too long for {key}')
        return v


# Update forward references
ValidatedProductPurchaseRequest.model_rebuild()
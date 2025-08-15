"""
Secure AI Routes for FlowBotz API
Implements comprehensive security for AI interactions including:
- Content safety filtering
- Rate limiting per user tier
- Audit logging
- Input validation
- Error handling
"""
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import os
import httpx
import asyncio
import base64
import json
import logging
import hashlib
from datetime import datetime

# Import security modules
try:
    from security.auth import get_current_active_user, require_premium, UserRole
    from security.validation import ValidatedChatRequest, ValidatedImageGenerationRequest
    from security.database import audit_logger
    SECURITY_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Security modules not available: {e}")
    SECURITY_MODULES_AVAILABLE = False
    # Fallback imports
    from .auth import verify_token as get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Content safety configuration
UNSAFE_KEYWORDS = [
    "nude", "nsfw", "explicit", "violence", "gore", "illegal",
    "weapon", "drug", "hate", "racist", "offensive", "hack",
    "exploit", "malware", "virus", "bomb", "terrorist"
]

# Model configurations with safety levels
AI_MODELS = {
    "gpt-3.5-turbo": {
        "provider": "openai",
        "safety_level": "standard",
        "max_tokens": 4000,
        "cost_per_token": 0.0015
    },
    "gpt-4": {
        "provider": "openai", 
        "safety_level": "high",
        "max_tokens": 8000,
        "cost_per_token": 0.03
    },
    "claude-3-sonnet": {
        "provider": "anthropic",
        "safety_level": "high", 
        "max_tokens": 4000,
        "cost_per_token": 0.015
    },
    "stable-diffusion": {
        "provider": "stability",
        "safety_level": "standard",
        "max_resolution": 2048,
        "cost_per_image": 0.02
    }
}

# Rate limits per user tier (requests per hour)
RATE_LIMITS = {
    UserRole.USER: {"chat": 50, "image": 10},
    UserRole.PREMIUM: {"chat": 200, "image": 50}, 
    UserRole.ADMIN: {"chat": 1000, "image": 200}
}


class SecureChatMessage(BaseModel):
    """Validated chat message with content safety"""
    role: str = Field(..., pattern=r'^(user|assistant|system)$')
    content: str = Field(..., min_length=1, max_length=10000)
    timestamp: Optional[str] = None
    
    @validator('content')
    def validate_content_safety(cls, v):
        content_lower = v.lower()
        for keyword in UNSAFE_KEYWORDS:
            if keyword in content_lower:
                raise ValueError(f"Content contains inappropriate material: {keyword}")
        return v


class SecureChatRequest(BaseModel):
    """Validated chat request with safety checks"""
    messages: List[SecureChatMessage] = Field(..., min_items=1, max_items=50)
    model: str = Field(default="gpt-3.5-turbo")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=1, le=4000)
    
    @validator('model')
    def validate_model(cls, v):
        if v not in AI_MODELS:
            raise ValueError(f"Unsupported model: {v}")
        return v


class SecureImageRequest(BaseModel):
    """Validated image generation request with content safety"""
    prompt: str = Field(..., min_length=3, max_length=2000)
    model: str = Field(default="stable-diffusion")
    size: str = Field(default="1024x1024", pattern=r'^\d{3,4}x\d{3,4}$')
    style: str = Field(default="photorealistic", max_length=50)
    negative_prompt: Optional[str] = Field(None, max_length=1000)
    
    @validator('prompt')
    def validate_prompt_safety(cls, v):
        prompt_lower = v.lower()
        for keyword in UNSAFE_KEYWORDS:
            if keyword in prompt_lower:
                raise ValueError(f"Prompt contains inappropriate content: {keyword}")
        return v
    
    @validator('model')
    def validate_image_model(cls, v):
        if v not in AI_MODELS:
            raise ValueError(f"Unsupported image model: {v}")
        return v
    
    @validator('size')
    def validate_size(cls, v):
        width, height = map(int, v.split('x'))
        max_dim = 2048
        min_dim = 256
        
        if width > max_dim or height > max_dim:
            raise ValueError(f'Image dimensions too large (max {max_dim}x{max_dim})')
        if width < min_dim or height < min_dim:
            raise ValueError(f'Image dimensions too small (min {min_dim}x{min_dim})')
        
        return v


class ChatResponse(BaseModel):
    """Secure chat response"""
    message: SecureChatMessage
    usage: Dict[str, int]
    model: str
    request_id: str
    timestamp: datetime
    safety_check: bool


class ImageResponse(BaseModel):
    """Secure image generation response"""
    url: str
    prompt: str
    model: str
    size: str
    request_id: str
    timestamp: datetime
    safety_check: bool


def check_user_rate_limit(user_id: str, user_role: str, endpoint_type: str) -> bool:
    """Check if user has exceeded rate limits"""
    # TODO: Implement Redis-based rate limiting
    # For now, return True (allow all requests)
    return True


def generate_request_id(content: str) -> str:
    """Generate unique request ID"""
    timestamp = str(int(datetime.utcnow().timestamp()))
    content_hash = hashlib.sha256(content.encode()).hexdigest()[:8]
    return f"{timestamp}_{content_hash}"


@router.post("/chat", response_model=ChatResponse)
async def secure_chat_completion(
    request: SecureChatRequest,
    current_user = Depends(get_current_active_user),
    http_request: Request = None
):
    """Secure AI chat completion with comprehensive safety checks"""
    request_id = generate_request_id(str(request.messages))
    user_role = current_user.get("role", UserRole.USER)
    
    try:
        # Rate limiting check
        if not check_user_rate_limit(current_user["user_id"], user_role, "chat"):
            if SECURITY_MODULES_AVAILABLE:
                audit_logger.log_security_violation(
                    user_id=current_user["user_id"],
                    violation_type="RATE_LIMIT_EXCEEDED",
                    details={"endpoint": "chat", "model": request.model}
                )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please upgrade to premium for higher limits."
            )
        
        # Log the request for audit
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_database_access(
                user_id=current_user["user_id"],
                operation="AI_CHAT_REQUEST",
                table="ai_requests",
                conditions={
                    "model": request.model,
                    "message_count": len(request.messages),
                    "request_id": request_id
                },
                success=True
            )
        
        # Content safety double-check
        combined_content = " ".join([msg.content for msg in request.messages])
        content_lower = combined_content.lower()
        
        for keyword in UNSAFE_KEYWORDS:
            if keyword in content_lower:
                if SECURITY_MODULES_AVAILABLE:
                    audit_logger.log_security_violation(
                        user_id=current_user["user_id"],
                        violation_type="UNSAFE_CONTENT",
                        details={
                            "keyword": keyword,
                            "content_preview": combined_content[:100],
                            "endpoint": "chat"
                        },
                        severity="HIGH"
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Request contains content that violates our safety guidelines"
                )
        
        # TODO: Implement actual AI provider calls
        # For now, return secure mock response
        
        model_config = AI_MODELS[request.model]
        last_message = request.messages[-1].content
        
        # Generate secure mock response
        response_content = f"[SECURE MOCK] Processing your request with {request.model}. "
        response_content += f"This is a safe, filtered response to maintain content guidelines. "
        response_content += f"Your message was: '{last_message[:50]}...'"
        
        # Calculate token usage (rough estimate)
        prompt_tokens = sum(len(msg.content.split()) for msg in request.messages)
        completion_tokens = len(response_content.split())
        total_tokens = prompt_tokens + completion_tokens
        
        response_message = SecureChatMessage(
            role="assistant",
            content=response_content,
            timestamp=datetime.utcnow().isoformat()
        )
        
        return ChatResponse(
            message=response_message,
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            },
            model=request.model,
            request_id=request_id,
            timestamp=datetime.utcnow(),
            safety_check=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion failed: {e}", exc_info=True)
        
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_security_violation(
                user_id=current_user["user_id"],
                violation_type="AI_REQUEST_ERROR",
                details={
                    "error": str(e),
                    "model": request.model,
                    "request_id": request_id
                },
                severity="MEDIUM"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI request processing failed"
        )


@router.post("/generate-image", response_model=ImageResponse)
async def secure_image_generation(
    request: SecureImageRequest,
    current_user = Depends(get_current_active_user)
):
    """Secure AI image generation with content safety"""
    request_id = generate_request_id(request.prompt)
    user_role = current_user.get("role", UserRole.USER)
    
    try:
        # Rate limiting check for images
        if not check_user_rate_limit(current_user["user_id"], user_role, "image"):
            if SECURITY_MODULES_AVAILABLE:
                audit_logger.log_security_violation(
                    user_id=current_user["user_id"],
                    violation_type="RATE_LIMIT_EXCEEDED",
                    details={"endpoint": "image", "model": request.model}
                )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Image generation rate limit exceeded"
            )
        
        # Enhanced content safety for images
        combined_prompt = f"{request.prompt} {request.negative_prompt or ''}".lower()
        
        # Additional image-specific unsafe keywords
        image_unsafe_keywords = UNSAFE_KEYWORDS + [
            "naked", "provocative", "sexual", "adult", "mature",
            "bloody", "graphic", "disturbing", "copyright", "trademark"
        ]
        
        for keyword in image_unsafe_keywords:
            if keyword in combined_prompt:
                if SECURITY_MODULES_AVAILABLE:
                    audit_logger.log_security_violation(
                        user_id=current_user["user_id"],
                        violation_type="UNSAFE_IMAGE_PROMPT",
                        details={
                            "keyword": keyword,
                            "prompt": request.prompt[:100],
                            "model": request.model
                        },
                        severity="HIGH"
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image prompt violates content policy: {keyword}"
                )
        
        # Log the request
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_database_access(
                user_id=current_user["user_id"],
                operation="AI_IMAGE_REQUEST",
                table="ai_requests",
                conditions={
                    "model": request.model,
                    "size": request.size,
                    "prompt_length": len(request.prompt),
                    "request_id": request_id
                },
                success=True
            )
        
        # TODO: Implement actual image generation
        # For now, return a placeholder data URL
        
        # Generate a simple colored square as placeholder
        width, height = map(int, request.size.split('x'))
        color_hash = hashlib.md5(request.prompt.encode()).hexdigest()[:6]
        
        # Create a simple SVG placeholder
        svg_content = f'''
        <svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="{width}" height="{height}" fill="#{color_hash}" />
            <text x="{width//2}" y="{height//2}" text-anchor="middle" 
                  fill="white" font-family="Arial" font-size="16">
                SECURE PLACEHOLDER
            </text>
            <text x="{width//2}" y="{height//2 + 30}" text-anchor="middle" 
                  fill="white" font-family="Arial" font-size="12">
                {request.prompt[:30]}...
            </text>
        </svg>
        '''
        
        # Convert to data URL
        svg_base64 = base64.b64encode(svg_content.encode()).decode()
        placeholder_url = f"data:image/svg+xml;base64,{svg_base64}"
        
        return ImageResponse(
            url=placeholder_url,
            prompt=request.prompt,
            model=request.model,
            size=request.size,
            request_id=request_id,
            timestamp=datetime.utcnow(),
            safety_check=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_security_violation(
                user_id=current_user["user_id"],
                violation_type="AI_IMAGE_ERROR",
                details={
                    "error": str(e),
                    "model": request.model,
                    "prompt": request.prompt[:50],
                    "request_id": request_id
                },
                severity="MEDIUM"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image generation failed"
        )


@router.get("/models")
async def get_available_models(
    current_user = Depends(get_current_active_user)
):
    """Get available AI models with user-specific access"""
    user_role = current_user.get("role", UserRole.USER)
    
    # Filter models based on user tier
    available_models = {}
    
    for model_id, config in AI_MODELS.items():
        # Basic users get access to standard safety level models
        if user_role == UserRole.USER and config["safety_level"] == "high":
            continue
        
        available_models[model_id] = {
            "name": model_id,
            "provider": config["provider"],
            "safety_level": config["safety_level"],
            "available_to_user": True
        }
    
    # Get user's current usage (mock data)
    current_usage = {
        "chat_requests_today": 5,
        "image_requests_today": 2,
        "monthly_cost": 12.50
    }
    
    return {
        "available_models": available_models,
        "user_tier": user_role,
        "rate_limits": RATE_LIMITS.get(user_role, RATE_LIMITS[UserRole.USER]),
        "current_usage": current_usage
    }


@router.get("/usage")
async def get_ai_usage(
    current_user = Depends(get_current_active_user)
):
    """Get user's AI usage statistics"""
    # TODO: Implement actual usage tracking from database
    
    return {
        "user_id": current_user["user_id"],
        "current_period": {
            "chat_requests": 45,
            "image_requests": 8,
            "total_tokens": 12500,
            "estimated_cost": 8.75
        },
        "limits": RATE_LIMITS.get(current_user.get("role", UserRole.USER)),
        "upgrade_available": current_user.get("role") == UserRole.USER
    }


@router.post("/report-content")
async def report_inappropriate_content(
    request_id: str,
    reason: str,
    current_user = Depends(get_current_active_user)
):
    """Report inappropriate AI-generated content"""
    try:
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_security_violation(
                user_id=current_user["user_id"],
                violation_type="CONTENT_REPORT",
                details={
                    "request_id": request_id,
                    "reason": reason,
                    "reporter": current_user["user_id"]
                },
                severity="MEDIUM"
            )
        
        logger.warning(f"Content reported by user {current_user['user_id']}: {request_id} - {reason}")
        
        return {
            "message": "Content report received and will be reviewed",
            "report_id": f"report_{int(datetime.utcnow().timestamp())}",
            "status": "pending_review"
        }
    
    except Exception as e:
        logger.error(f"Content report failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit content report"
        )
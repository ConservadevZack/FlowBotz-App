"""
Enterprise API Routes
Advanced enterprise features including white-label, custom domains, and webhooks
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr

from models.enterprise import (
    WhitelabelConfig, CustomDomain, BrandingSettings, 
    IntegrationConfig, Enterprise, WebhookEndpoint
)
from models.common import SecurityContext, ResponseModel
from security.auth import get_current_user
from app.services.enterprise import EnterpriseService
from app.services.webhook import WebhookService

router = APIRouter()

# Initialize services
enterprise_service = EnterpriseService()
webhook_service = WebhookService()

# Request models
class WhitelabelConfigCreate(BaseModel):
    name: str
    company_name: str
    subdomain: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#000000"
    secondary_color: str = "#ffffff"
    enabled_features: List[str] = []
    api_prefix: str = "/api/v1"

class CustomDomainCreate(BaseModel):
    domain: str

class BrandingUpdate(BaseModel):
    brand_name: str
    tagline: Optional[str] = None
    logo_light_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    primary_color: str = "#007bff"
    secondary_color: str = "#6c757d"
    custom_css: Optional[str] = None

class IntegrationCreate(BaseModel):
    type: str
    name: str
    config: Dict[str, Any] = {}
    credentials: Optional[Dict[str, str]] = None
    webhook_url: Optional[str] = None
    events: List[str] = []
    test_connection: bool = False

class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str]

class WebhookEndpointCreate(BaseModel):
    name: str
    url: str
    events: List[str]
    timeout: Optional[int] = 30
    max_retries: Optional[int] = 3
    filters: Dict[str, Any] = {}

@router.post("/organizations/{org_id}/whitelabel", response_model=ResponseModel[WhitelabelConfig])
async def create_whitelabel_config(
    org_id: UUID,
    config_data: WhitelabelConfigCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Create white-label configuration for organization"""
    config = await enterprise_service.create_whitelabel_config(
        org_id,
        config_data.dict(),
        user_context
    )
    return ResponseModel(data=config, message="White-label configuration created successfully")

@router.get("/organizations/{org_id}/whitelabel", response_model=ResponseModel[WhitelabelConfig])
async def get_whitelabel_config(
    org_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get white-label configuration"""
    # This would query the database for the config
    pass

@router.post("/organizations/{org_id}/domains", response_model=ResponseModel[CustomDomain])
async def setup_custom_domain(
    org_id: UUID,
    domain_data: CustomDomainCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Set up custom domain for organization"""
    domain = await enterprise_service.setup_custom_domain(
        org_id,
        domain_data.domain,
        user_context
    )
    return ResponseModel(data=domain, message="Custom domain setup initiated")

@router.get("/organizations/{org_id}/domains", response_model=ResponseModel[List[CustomDomain]])
async def get_custom_domains(
    org_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get organization's custom domains"""
    # Implementation would query domains
    pass

@router.put("/organizations/{org_id}/branding", response_model=ResponseModel[BrandingSettings])
async def update_branding_settings(
    org_id: UUID,
    branding_data: BrandingUpdate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Update organization branding settings"""
    branding = await enterprise_service.update_branding_settings(
        org_id,
        branding_data.dict(),
        user_context
    )
    return ResponseModel(data=branding, message="Branding settings updated")

@router.get("/organizations/{org_id}/branding", response_model=ResponseModel[BrandingSettings])
async def get_branding_settings(
    org_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get organization branding settings"""
    # Implementation would get branding settings
    pass

@router.post("/organizations/{org_id}/integrations", response_model=ResponseModel[IntegrationConfig])
async def create_integration(
    org_id: UUID,
    integration_data: IntegrationCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Create external integration"""
    integration = await enterprise_service.create_integration(
        org_id,
        integration_data.dict(),
        user_context
    )
    return ResponseModel(data=integration, message="Integration created successfully")

@router.get("/organizations/{org_id}/integrations", response_model=ResponseModel[List[IntegrationConfig]])
async def get_integrations(
    org_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get organization integrations"""
    # Implementation would list integrations
    pass

@router.post("/organizations/{org_id}/api-keys", response_model=ResponseModel[Dict[str, str]])
async def generate_api_key(
    org_id: UUID,
    key_data: APIKeyCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Generate new API key"""
    result = await enterprise_service.generate_api_key(
        org_id,
        key_data.name,
        key_data.permissions,
        user_context
    )
    return ResponseModel(
        data=result, 
        message="API key generated successfully. Store it securely - it won't be shown again."
    )

@router.get("/organizations/{org_id}/api-usage", response_model=ResponseModel[Dict[str, Any]])
async def get_api_usage_stats(
    org_id: UUID,
    period_days: int = 30,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get API usage statistics"""
    stats = await enterprise_service.get_api_usage_stats(
        org_id,
        period_days,
        user_context
    )
    return ResponseModel(data=stats, message="API usage statistics retrieved")

# Webhook endpoints
@router.post("/organizations/{org_id}/webhooks", response_model=ResponseModel[WebhookEndpoint])
async def create_webhook_endpoint(
    org_id: UUID,
    webhook_data: WebhookEndpointCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Create webhook endpoint"""
    endpoint = await webhook_service.create_webhook_endpoint(
        org_id,
        webhook_data.dict(),
        user_context
    )
    return ResponseModel(data=endpoint, message="Webhook endpoint created successfully")

@router.get("/organizations/{org_id}/webhooks", response_model=ResponseModel[List[WebhookEndpoint]])
async def get_webhook_endpoints(
    org_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get organization webhook endpoints"""
    # Implementation would list webhooks
    pass

@router.get("/webhooks/{endpoint_id}/deliveries")
async def get_webhook_deliveries(
    endpoint_id: UUID,
    limit: int = 50,
    offset: int = 0,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get webhook delivery history"""
    deliveries = await webhook_service.get_webhook_deliveries(endpoint_id, limit, offset)
    return ResponseModel(data=deliveries, message="Webhook deliveries retrieved")

@router.post("/webhooks/{endpoint_id}/test")
async def test_webhook_endpoint(
    endpoint_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Test webhook endpoint"""
    success = await webhook_service.test_webhook_endpoint(endpoint_id, user_context)
    
    if success:
        return ResponseModel(data={"success": True}, message="Test webhook sent successfully")
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test webhook"
        )

@router.post("/webhooks/deliveries/{delivery_id}/retry")
async def retry_webhook_delivery(
    delivery_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Retry webhook delivery"""
    success = await webhook_service.retry_webhook_delivery(delivery_id, user_context)
    
    if success:
        return ResponseModel(data={"success": True}, message="Webhook delivery queued for retry")
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue webhook for retry"
        )

@router.get("/webhooks/{endpoint_id}/stats")
async def get_webhook_stats(
    endpoint_id: UUID,
    days: int = 30,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get webhook endpoint statistics"""
    stats = await webhook_service.get_webhook_stats(endpoint_id, days)
    return ResponseModel(data=stats, message="Webhook statistics retrieved")

# API key validation endpoint (used by middleware)
@router.post("/api-keys/validate")
async def validate_api_key(request: Request):
    """Validate API key (internal use)"""
    api_key = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    key_info = await enterprise_service.validate_api_key(api_key)
    
    if not key_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return ResponseModel(data=key_info, message="API key valid")
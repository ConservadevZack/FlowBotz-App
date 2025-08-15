"""
Enterprise Service
White-label APIs, custom domains, and enterprise features
"""

from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import os
import json
import asyncio
from pathlib import Path

from fastapi import HTTPException, status
from supabase import create_client, Client
from models.enterprise import (
    WhitelabelConfig, CustomDomain, BrandingSettings, 
    IntegrationConfig, Enterprise, APIUsage
)
from models.common import SecurityContext
from .caching import CachingService
from .webhook import WebhookService

class EnterpriseService:
    """Enterprise features and white-label management"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.cache = CachingService()
        self.webhook_service = WebhookService()
        
        # Domain verification settings
        self.dns_verification_timeout = 300  # 5 minutes
        self.ssl_provisioning_timeout = 3600  # 1 hour
        
        # API usage tracking
        self.usage_tracking_enabled = True
        self.usage_batch_size = 1000
    
    async def create_whitelabel_config(
        self,
        organization_id: UUID,
        config_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> WhitelabelConfig:
        """Create white-label configuration"""
        try:
            # Validate subdomain availability
            await self._validate_subdomain(config_data.get("subdomain"))
            
            config = WhitelabelConfig(
                id=uuid4(),
                organization_id=organization_id,
                name=config_data["name"],
                company_name=config_data["company_name"],
                logo_url=config_data.get("logo_url"),
                favicon_url=config_data.get("favicon_url"),
                primary_color=config_data.get("primary_color", "#000000"),
                secondary_color=config_data.get("secondary_color", "#ffffff"),
                subdomain=config_data["subdomain"],
                enabled_features=config_data.get("enabled_features", []),
                api_prefix=config_data.get("api_prefix", "/api/v1"),
                is_active=False,  # Needs approval
                created_at=datetime.utcnow()
            )
            
            # Store in database
            result = self.supabase.table("whitelabel_configs")\
                .insert(config.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create white-label configuration"
                )
            
            # Cache configuration
            await self.cache.set(
                f"whitelabel:{config.subdomain}",
                config.dict(),
                ttl=3600
            )
            
            return config
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create white-label config: {str(e)}"
            )
    
    async def setup_custom_domain(
        self,
        organization_id: UUID,
        domain: str,
        user_context: SecurityContext
    ) -> CustomDomain:
        """Set up custom domain for organization"""
        try:
            # Validate domain format
            if not self._is_valid_domain(domain):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid domain format"
                )
            
            # Check if domain already exists
            existing = await self._get_domain_by_name(domain)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Domain already in use"
                )
            
            # Generate verification token
            verification_token = self._generate_verification_token()
            
            custom_domain = CustomDomain(
                id=uuid4(),
                organization_id=organization_id,
                domain=domain.lower(),
                dns_verification_token=verification_token,
                dns_verified=False,
                ssl_enabled=False,
                ssl_status="pending",
                is_active=False,
                created_at=datetime.utcnow()
            )
            
            # Create CNAME target
            custom_domain.cname_target = f"domains.flowbotz.com"
            
            # Store in database
            result = self.supabase.table("custom_domains")\
                .insert(custom_domain.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create custom domain"
                )
            
            # Start domain verification process
            asyncio.create_task(self._verify_domain(custom_domain.id))
            
            return custom_domain
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to setup custom domain: {str(e)}"
            )
    
    async def update_branding_settings(
        self,
        organization_id: UUID,
        branding_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> BrandingSettings:
        """Update organization branding settings"""
        try:
            # Get existing branding or create new
            branding = await self._get_branding_settings(organization_id)
            
            if not branding:
                branding = BrandingSettings(
                    id=uuid4(),
                    organization_id=organization_id,
                    brand_name=branding_data["brand_name"],
                    created_at=datetime.utcnow()
                )
            
            # Update fields
            for field, value in branding_data.items():
                if hasattr(branding, field):
                    setattr(branding, field, value)
            
            branding.updated_at = datetime.utcnow()
            
            # Store in database
            result = self.supabase.table("branding_settings")\
                .upsert(branding.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update branding settings"
                )
            
            # Update cache
            await self.cache.set(
                f"branding:{organization_id}",
                branding.dict(),
                ttl=3600
            )
            
            # Invalidate related caches
            await self.cache.delete_pattern(f"whitelabel:*:{organization_id}")
            
            return branding
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update branding: {str(e)}"
            )
    
    async def create_integration(
        self,
        organization_id: UUID,
        integration_data: Dict[str, Any],
        user_context: SecurityContext
    ) -> IntegrationConfig:
        """Create external integration configuration"""
        try:
            integration = IntegrationConfig(
                id=uuid4(),
                organization_id=organization_id,
                integration_type=integration_data["type"],
                name=integration_data["name"],
                config=integration_data.get("config", {}),
                webhook_url=integration_data.get("webhook_url"),
                subscribed_events=integration_data.get("events", []),
                is_active=integration_data.get("is_active", True),
                created_at=datetime.utcnow()
            )
            
            # Encrypt sensitive credentials
            if "credentials" in integration_data:
                integration.credentials = await self._encrypt_credentials(
                    integration_data["credentials"]
                )
            
            # Store in database
            result = self.supabase.table("integration_configs")\
                .insert(integration.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create integration"
                )
            
            # Test integration if requested
            if integration_data.get("test_connection", False):
                await self._test_integration(integration)
            
            return integration
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create integration: {str(e)}"
            )
    
    async def get_api_usage_stats(
        self,
        organization_id: UUID,
        period_days: int = 30,
        user_context: Optional[SecurityContext] = None
    ) -> Dict[str, Any]:
        """Get API usage statistics"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            # Check cache first
            cache_key = f"api_usage:{organization_id}:{period_days}"
            cached_stats = await self.cache.get(cache_key)
            
            if cached_stats:
                return cached_stats
            
            # Query usage data
            result = self.supabase.table("api_usage")\
                .select("*")\
                .eq("organization_id", str(organization_id))\
                .gte("period_start", start_date.isoformat())\
                .lte("period_end", end_date.isoformat())\
                .execute()
            
            usage_records = [APIUsage(**u) for u in result.data]
            
            # Aggregate statistics
            stats = {
                "total_requests": sum(u.total_requests for u in usage_records),
                "successful_requests": sum(u.successful_requests for u in usage_records),
                "failed_requests": sum(u.failed_requests for u in usage_records),
                "rate_limit_hits": sum(u.rate_limit_hits for u in usage_records),
                "total_cost": sum(u.cost.amount for u in usage_records),
                "period_days": period_days,
                "endpoints": {},
                "daily_breakdown": []
            }
            
            # Calculate success rate
            if stats["total_requests"] > 0:
                stats["success_rate"] = (stats["successful_requests"] / stats["total_requests"]) * 100
            else:
                stats["success_rate"] = 0
            
            # Endpoint breakdown
            for usage in usage_records:
                for endpoint, data in usage.endpoint_usage.items():
                    if endpoint not in stats["endpoints"]:
                        stats["endpoints"][endpoint] = {"requests": 0, "errors": 0}
                    stats["endpoints"][endpoint]["requests"] += data.get("requests", 0)
                    stats["endpoints"][endpoint]["errors"] += data.get("errors", 0)
            
            # Cache for 15 minutes
            await self.cache.set(cache_key, stats, ttl=900)
            
            return stats
            
        except Exception as e:
            print(f"API usage stats error: {e}")
            return {}
    
    async def generate_api_key(
        self,
        organization_id: UUID,
        key_name: str,
        permissions: List[str],
        user_context: SecurityContext
    ) -> Dict[str, str]:
        """Generate new API key for organization"""
        try:
            # Generate secure API key
            import secrets
            api_key = f"fb_live_{secrets.token_urlsafe(32)}"
            key_hash = self._hash_api_key(api_key)
            
            # Store in database
            key_data = {
                "id": str(uuid4()),
                "organization_id": str(organization_id),
                "name": key_name,
                "key_hash": key_hash,
                "permissions": permissions,
                "created_by": str(user_context.user_id),
                "is_active": True,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("api_keys")\
                .insert(key_data)\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create API key"
                )
            
            # Cache key info (without the actual key)
            await self.cache.set(
                f"api_key:{key_hash}",
                {
                    "organization_id": str(organization_id),
                    "permissions": permissions,
                    "is_active": True
                },
                ttl=3600
            )
            
            return {
                "api_key": api_key,
                "key_id": key_data["id"],
                "permissions": permissions
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate API key: {str(e)}"
            )
    
    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate API key and return organization info"""
        try:
            key_hash = self._hash_api_key(api_key)
            
            # Check cache first
            cached_info = await self.cache.get(f"api_key:{key_hash}")
            if cached_info:
                return cached_info
            
            # Query database
            result = self.supabase.table("api_keys")\
                .select("organization_id, permissions, is_active")\
                .eq("key_hash", key_hash)\
                .eq("is_active", True)\
                .execute()
            
            if not result.data:
                return None
            
            key_info = result.data[0]
            
            # Cache for future use
            await self.cache.set(
                f"api_key:{key_hash}",
                key_info,
                ttl=3600
            )
            
            return key_info
            
        except Exception as e:
            print(f"API key validation error: {e}")
            return None
    
    async def track_api_usage(
        self,
        organization_id: UUID,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
        api_key_id: Optional[UUID] = None
    ):
        """Track API usage for billing and analytics"""
        if not self.usage_tracking_enabled:
            return
        
        try:
            # Increment counters in cache
            date_key = datetime.utcnow().strftime("%Y-%m-%d")
            usage_key = f"usage:{organization_id}:{date_key}"
            
            # Increment total requests
            await self.cache.increment(f"{usage_key}:total", ttl=86400)
            
            # Increment success/failure counters
            if 200 <= status_code < 400:
                await self.cache.increment(f"{usage_key}:success", ttl=86400)
            else:
                await self.cache.increment(f"{usage_key}:error", ttl=86400)
            
            # Increment endpoint-specific counters
            endpoint_key = f"{usage_key}:endpoint:{endpoint}"
            await self.cache.increment(endpoint_key, ttl=86400)
            
            # Track response times
            await self.cache.add_to_sorted_set(
                f"{usage_key}:response_times",
                response_time,
                f"{endpoint}:{datetime.utcnow().timestamp()}",
                ttl=86400
            )
            
        except Exception as e:
            print(f"API usage tracking error: {e}")
    
    async def _validate_subdomain(self, subdomain: str):
        """Validate subdomain availability and format"""
        if not subdomain or len(subdomain) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subdomain must be at least 3 characters"
            )
        
        # Check if subdomain is already taken
        result = self.supabase.table("whitelabel_configs")\
            .select("id")\
            .eq("subdomain", subdomain.lower())\
            .execute()
        
        if result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subdomain already taken"
            )
    
    def _is_valid_domain(self, domain: str) -> bool:
        """Validate domain format"""
        import re
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        return bool(re.match(pattern, domain))
    
    def _generate_verification_token(self) -> str:
        """Generate domain verification token"""
        import secrets
        return secrets.token_hex(16)
    
    async def _verify_domain(self, domain_id: UUID):
        """Background task to verify domain DNS"""
        try:
            # Get domain record
            result = self.supabase.table("custom_domains")\
                .select("*")\
                .eq("id", str(domain_id))\
                .execute()
            
            if not result.data:
                return
            
            domain = CustomDomain(**result.data[0])
            
            # Perform DNS verification (mock implementation)
            # In production, this would check actual DNS records
            await asyncio.sleep(10)  # Simulate DNS propagation delay
            
            # Update domain as verified
            self.supabase.table("custom_domains")\
                .update({
                    "dns_verified": True,
                    "verified_at": datetime.utcnow().isoformat(),
                    "ssl_status": "provisioning"
                })\
                .eq("id", str(domain_id))\
                .execute()
            
            # Start SSL provisioning
            asyncio.create_task(self._provision_ssl(domain_id))
            
        except Exception as e:
            print(f"Domain verification error: {e}")
    
    async def _provision_ssl(self, domain_id: UUID):
        """Background task to provision SSL certificate"""
        try:
            # Simulate SSL provisioning
            await asyncio.sleep(30)
            
            # Update domain with SSL info
            self.supabase.table("custom_domains")\
                .update({
                    "ssl_enabled": True,
                    "ssl_status": "active",
                    "ssl_expires_at": (datetime.utcnow() + timedelta(days=90)).isoformat(),
                    "is_active": True
                })\
                .eq("id", str(domain_id))\
                .execute()
            
        except Exception as e:
            print(f"SSL provisioning error: {e}")
    
    async def _get_domain_by_name(self, domain: str) -> Optional[CustomDomain]:
        """Get custom domain by name"""
        try:
            result = self.supabase.table("custom_domains")\
                .select("*")\
                .eq("domain", domain.lower())\
                .execute()
            
            if result.data:
                return CustomDomain(**result.data[0])
            
            return None
            
        except Exception:
            return None
    
    async def _get_branding_settings(self, organization_id: UUID) -> Optional[BrandingSettings]:
        """Get branding settings for organization"""
        try:
            # Check cache first
            cached = await self.cache.get(f"branding:{organization_id}")
            if cached:
                return BrandingSettings(**cached)
            
            # Query database
            result = self.supabase.table("branding_settings")\
                .select("*")\
                .eq("organization_id", str(organization_id))\
                .execute()
            
            if result.data:
                branding = BrandingSettings(**result.data[0])
                # Cache for future use
                await self.cache.set(
                    f"branding:{organization_id}",
                    branding.dict(),
                    ttl=3600
                )
                return branding
            
            return None
            
        except Exception:
            return None
    
    async def _encrypt_credentials(self, credentials: Dict[str, Any]) -> Dict[str, str]:
        """Encrypt sensitive credentials"""
        # In production, use proper encryption
        # For now, just return as-is (would be base64 encoded)
        import base64
        import json
        
        encrypted = {}
        for key, value in credentials.items():
            encoded = base64.b64encode(json.dumps(value).encode()).decode()
            encrypted[key] = encoded
        
        return encrypted
    
    async def _test_integration(self, integration: IntegrationConfig) -> bool:
        """Test integration connection"""
        # Mock implementation
        return True
    
    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        import hashlib
        return hashlib.sha256(api_key.encode()).hexdigest()
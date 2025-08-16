"""
Security configuration for FlowBotz API
Environment-aware security settings for different deployment stages
"""
import os
from typing import Dict, List, Optional
from enum import Enum

class Environment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

def get_environment() -> Environment:
    """Determine current environment from ENV variable"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        return Environment.PRODUCTION
    elif env == "staging":
        return Environment.STAGING
    return Environment.DEVELOPMENT

class SecurityConfig:
    """Environment-specific security configuration"""
    
    def __init__(self):
        self.env = get_environment()
        
    @property
    def allowed_origins(self) -> List[str]:
        """CORS allowed origins based on environment"""
        if self.env == Environment.PRODUCTION:
            return [
                "https://flowbotz.com",
                "https://www.flowbotz.com",
                "https://app.flowbotz.com"
            ]
        elif self.env == Environment.STAGING:
            return [
                "https://staging.flowbotz.com",
                "http://localhost:3000"
            ]
        else:  # Development
            return [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000"
            ]
    
    @property
    def rate_limits(self) -> Dict[str, int]:
        """Rate limits per endpoint (requests per minute)"""
        if self.env == Environment.PRODUCTION:
            return {
                "/api/auth/login": 5,
                "/api/auth/register": 3,
                "/api/auth/reset-password": 3,
                "/api/ai/": 30,
                "/api/payments/": 10,
                "/api/pod/": 50,
                "default": 100
            }
        else:  # More lenient for development/staging
            return {
                "/api/auth/login": 20,
                "/api/auth/register": 10,
                "/api/auth/reset-password": 10,
                "/api/ai/": 100,
                "/api/payments/": 50,
                "/api/pod/": 200,
                "default": 500
            }
    
    @property
    def burst_limits(self) -> Dict[str, int]:
        """Burst limits per endpoint (requests per 10 seconds)"""
        if self.env == Environment.PRODUCTION:
            return {
                "/api/auth/login": 3,
                "/api/auth/register": 2,
                "/api/ai/": 10,
                "/api/payments/": 5,
                "default": 30
            }
        else:
            return {
                "/api/auth/login": 10,
                "/api/auth/register": 5,
                "/api/ai/": 30,
                "/api/payments/": 20,
                "default": 100
            }
    
    @property
    def security_headers(self) -> Dict[str, str]:
        """Security headers configuration"""
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
        }
        
        if self.env == Environment.PRODUCTION:
            # Stricter CSP for production
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://js.stripe.com https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://api.stripe.com https://api.openai.com wss://flowbotz.com; "
                "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "upgrade-insecure-requests;"
            )
            # HSTS for production
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        else:
            # More permissive CSP for development
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' https:; "
                "connect-src 'self' http: https: ws: wss:; "
                "frame-src 'self' https:; "
                "object-src 'none'; "
                "base-uri 'self';"
            )
        
        return headers
    
    @property
    def session_config(self) -> Dict[str, any]:
        """Session configuration"""
        if self.env == Environment.PRODUCTION:
            return {
                "cookie_secure": True,  # HTTPS only
                "cookie_httponly": True,
                "cookie_samesite": "strict",
                "session_timeout": 3600,  # 1 hour
                "max_sessions_per_user": 3
            }
        else:
            return {
                "cookie_secure": False,  # Allow HTTP in dev
                "cookie_httponly": True,
                "cookie_samesite": "lax",
                "session_timeout": 86400,  # 24 hours
                "max_sessions_per_user": 10
            }
    
    @property
    def password_policy(self) -> Dict[str, any]:
        """Password policy configuration"""
        if self.env == Environment.PRODUCTION:
            return {
                "min_length": 12,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special": True,
                "max_age_days": 90,
                "history_count": 5,  # Prevent reusing last 5 passwords
                "lockout_attempts": 5,
                "lockout_duration_minutes": 30
            }
        else:
            return {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special": False,
                "max_age_days": 365,
                "history_count": 0,
                "lockout_attempts": 10,
                "lockout_duration_minutes": 5
            }
    
    @property
    def jwt_config(self) -> Dict[str, any]:
        """JWT token configuration"""
        return {
            "access_token_expire_minutes": 15 if self.env == Environment.PRODUCTION else 60,
            "refresh_token_expire_days": 7 if self.env == Environment.PRODUCTION else 30,
            "algorithm": "HS256",
            "issuer": "flowbotz.com",
            "audience": ["flowbotz-api"]
        }
    
    @property
    def file_upload_config(self) -> Dict[str, any]:
        """File upload configuration"""
        return {
            "max_file_size": 10 * 1024 * 1024 if self.env == Environment.PRODUCTION else 50 * 1024 * 1024,  # 10MB prod, 50MB dev
            "allowed_extensions": [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".svg"],
            "allowed_mime_types": [
                "image/jpeg", "image/png", "image/gif", 
                "image/svg+xml", "application/pdf"
            ],
            "scan_for_malware": self.env == Environment.PRODUCTION,
            "store_location": "/secure/uploads" if self.env == Environment.PRODUCTION else "/tmp/uploads"
        }
    
    @property
    def monitoring_config(self) -> Dict[str, any]:
        """Security monitoring configuration"""
        return {
            "log_level": "WARNING" if self.env == Environment.PRODUCTION else "INFO",
            "log_sensitive_data": False,
            "alert_on_suspicious_activity": self.env == Environment.PRODUCTION,
            "alert_channels": ["email", "slack"] if self.env == Environment.PRODUCTION else ["console"],
            "metrics_enabled": True,
            "audit_log_retention_days": 90 if self.env == Environment.PRODUCTION else 7
        }
    
    @property
    def api_keys_config(self) -> Dict[str, any]:
        """API keys configuration"""
        return {
            "rotation_days": 30 if self.env == Environment.PRODUCTION else 365,
            "require_ip_whitelist": self.env == Environment.PRODUCTION,
            "max_keys_per_user": 3 if self.env == Environment.PRODUCTION else 10,
            "key_prefix": "flwbtz_" if self.env == Environment.PRODUCTION else "test_"
        }

# Global security config instance
security_config = SecurityConfig()

# Helper functions
def is_production() -> bool:
    """Check if running in production"""
    return security_config.env == Environment.PRODUCTION

def is_development() -> bool:
    """Check if running in development"""
    return security_config.env == Environment.DEVELOPMENT

def get_secure_cookie_settings() -> Dict[str, any]:
    """Get cookie settings for the current environment"""
    config = security_config.session_config
    return {
        "secure": config["cookie_secure"],
        "httponly": config["cookie_httponly"],
        "samesite": config["cookie_samesite"]
    }

def validate_password(password: str) -> tuple[bool, Optional[str]]:
    """Validate password against policy"""
    policy = security_config.password_policy
    
    if len(password) < policy["min_length"]:
        return False, f"Password must be at least {policy['min_length']} characters"
    
    if policy["require_uppercase"] and not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if policy["require_lowercase"] and not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if policy["require_numbers"] and not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    if policy["require_special"] and not any(c in "!@#$%^&*(),.?\":{}|<>" for c in password):
        return False, "Password must contain at least one special character"
    
    return True, None
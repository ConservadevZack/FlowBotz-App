"""
Security middleware for FlowBotz API
Implements OWASP security best practices including:
- Rate limiting
- Security headers
- Request validation
- CSRF protection
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import hashlib
import hmac
import os
from collections import defaultdict, deque
from datetime import datetime, timedelta
import ipaddress
import re


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self' https:; "
            "frame-src 'self' https://js.stripe.com; "
            "object-src 'none'; "
            "base-uri 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # HTTPS Strict Transport Security
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Frame Options
        response.headers["X-Frame-Options"] = "DENY"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using sliding window algorithm"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests = defaultdict(deque)
        self.blocked_ips = defaultdict(datetime)
        
        # Rate limits per endpoint pattern (requests per minute)
        self.rate_limits = {
            "/api/auth/login": 5,           # Login attempts
            "/api/auth/register": 3,        # Registration attempts
            "/api/ai/": 20,                 # AI endpoints
            "/api/payments/": 10,           # Payment endpoints
            "default": 100                  # Default rate limit
        }
        
        # Burst limits (requests per 10 seconds)
        self.burst_limits = {
            "/api/auth/login": 3,
            "/api/auth/register": 2,
            "/api/ai/": 5,
            "/api/payments/": 3,
            "default": 20
        }
    
    def get_client_ip(self, request: Request) -> str:
        """Get client IP address, considering proxies"""
        # Check for forwarded headers (in order of preference)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP if multiple are present
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host
    
    def is_ip_blocked(self, client_ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        if client_ip in self.blocked_ips:
            if datetime.now() - self.blocked_ips[client_ip] > timedelta(hours=1):
                # Unblock after 1 hour
                del self.blocked_ips[client_ip]
                return False
            return True
        return False
    
    def get_rate_limit_key(self, path: str) -> str:
        """Get rate limit key for endpoint"""
        for pattern in self.rate_limits:
            if pattern != "default" and pattern in path:
                return pattern
        return "default"
    
    def clean_old_requests(self, requests_deque: deque, window_seconds: int):
        """Remove requests older than window"""
        cutoff = time.time() - window_seconds
        while requests_deque and requests_deque[0] < cutoff:
            requests_deque.popleft()
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        
        # Check if IP is blocked
        if self.is_ip_blocked(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="IP temporarily blocked due to suspicious activity"
            )
        
        path = request.url.path
        rate_limit_key = self.get_rate_limit_key(path)
        
        # Create unique key for IP + endpoint
        key = f"{client_ip}:{rate_limit_key}"
        current_time = time.time()
        
        # Clean old requests
        self.clean_old_requests(self.requests[key], 60)  # 1 minute window
        
        # Check rate limits
        minute_limit = self.rate_limits[rate_limit_key]
        burst_limit = self.burst_limits.get(rate_limit_key, self.burst_limits["default"])
        
        # Count requests in last minute
        minute_count = len(self.requests[key])
        
        # Count requests in last 10 seconds (burst protection)
        burst_requests = [r for r in self.requests[key] if current_time - r <= 10]
        burst_count = len(burst_requests)
        
        if minute_count >= minute_limit:
            # Block IP after repeated violations
            violation_key = f"{client_ip}:violations"
            self.requests[violation_key].append(current_time)
            self.clean_old_requests(self.requests[violation_key], 3600)  # Track violations for 1 hour
            
            if len(self.requests[violation_key]) >= 5:  # 5 violations in an hour
                self.blocked_ips[client_ip] = datetime.now()
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {minute_limit} requests per minute."
            )
        
        if burst_count >= burst_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Burst limit exceeded. Max {burst_limit} requests per 10 seconds."
            )
        
        # Record this request
        self.requests[key].append(current_time)
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = minute_limit - minute_count - 1
        response.headers["X-RateLimit-Limit"] = str(minute_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate and sanitize all incoming requests"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Patterns for malicious content
        self.sql_injection_patterns = [
            r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)",
            r"(?i)(or\s+1\s*=\s*1|and\s+1\s*=\s*1)",
            r"(?i)(script|javascript|vbscript)",
            r"['\"];?\s*(drop|delete|insert|update|select)",
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
        ]
    
    def contains_malicious_content(self, content: str) -> bool:
        """Check if content contains malicious patterns"""
        if not isinstance(content, str):
            return False
        
        content_lower = content.lower()
        
        # Check for SQL injection patterns
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, content_lower):
                return True
        
        # Check for XSS patterns
        for pattern in self.xss_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        return False
    
    def validate_request_size(self, request: Request):
        """Validate request size limits"""
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            max_size = 10 * 1024 * 1024  # 10MB limit
            
            # Different limits for different endpoints
            if "/api/ai/generate-image" in str(request.url):
                max_size = 50 * 1024 * 1024  # 50MB for image generation
            elif "/api/payments/" in str(request.url):
                max_size = 1024 * 1024  # 1MB for payments
            elif "/api/auth/" in str(request.url):
                max_size = 10 * 1024  # 10KB for auth
            
            if size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Request size exceeds limit"
                )
    
    async def dispatch(self, request: Request, call_next):
        # Validate request size
        self.validate_request_size(request)
        
        # Validate URL path
        path = str(request.url.path)
        if self.contains_malicious_content(path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malicious content detected in request path"
            )
        
        # Validate query parameters
        query_params = str(request.url.query)
        if query_params and self.contains_malicious_content(query_params):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malicious content detected in query parameters"
            )
        
        # Validate headers (check for injection attempts)
        for name, value in request.headers.items():
            if self.contains_malicious_content(value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Malicious content detected in header: {name}"
                )
        
        response = await call_next(request)
        return response


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection for state-changing operations"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.secret_key = os.getenv("CSRF_SECRET_KEY", os.getenv("JWT_SECRET_KEY", "default-csrf-key"))
        
        # Methods that require CSRF protection
        self.protected_methods = {"POST", "PUT", "PATCH", "DELETE"}
        
        # Endpoints that don't require CSRF (API endpoints with proper auth)
        self.csrf_exempt_paths = {
            "/api/webhooks/",
            "/api/auth/login",
            "/api/auth/register"
        }
    
    def generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        message = f"{session_id}:{int(time.time() // 3600)}"  # Valid for 1 hour
        signature = hmac.new(
            self.secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{message}:{signature}"
    
    def validate_csrf_token(self, token: str, session_id: str) -> bool:
        """Validate CSRF token"""
        try:
            parts = token.split(":")
            if len(parts) != 3:
                return False
            
            session, timestamp, signature = parts
            if session != session_id:
                return False
            
            # Check if token is not too old (1 hour)
            if int(time.time()) - int(timestamp) * 3600 > 3600:
                return False
            
            # Verify signature
            expected_token = self.generate_csrf_token(session_id)
            return hmac.compare_digest(token, expected_token)
        except Exception:
            return False
    
    def is_csrf_exempt(self, path: str) -> bool:
        """Check if path is exempt from CSRF protection"""
        return any(exempt in path for exempt in self.csrf_exempt_paths)
    
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods and exempt paths
        if (request.method not in self.protected_methods or 
            self.is_csrf_exempt(request.url.path)):
            return await call_next(request)
        
        # For non-API endpoints (web forms), check CSRF token
        if not request.url.path.startswith("/api/"):
            csrf_token = request.headers.get("X-CSRF-Token")
            session_id = request.cookies.get("session_id", "anonymous")
            
            if not csrf_token or not self.validate_csrf_token(csrf_token, session_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing or invalid"
                )
        
        response = await call_next(request)
        return response


def init_security_middleware(app):
    """Initialize all security middleware"""
    app.add_middleware(CSRFProtectionMiddleware)
    app.add_middleware(RequestValidationMiddleware) 
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    
    return app
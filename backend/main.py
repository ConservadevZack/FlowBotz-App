from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import os
import logging
import time
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_security.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import routes  
from app.routes import auth, workflows, ai, webhooks, health, designs, pod, payments

# Import security middleware and config
from security.middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestValidationMiddleware,
    CSRFProtectionMiddleware,
    init_security_middleware
)
from security.config import security_config, is_production

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 FlowBotz API starting up...")
    
    # Start POD order sync service
    try:
        from app.services.pod_order_sync import start_pod_sync_service
        await start_pod_sync_service()
        print("🔄 POD Order Sync Service initialized")
    except Exception as e:
        print(f"⚠️  POD Sync Service failed to start: {e}")
    
    yield
    # Shutdown
    print("🛑 FlowBotz API shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="FlowBotz API",
    description="Premium automation platform with glassmorphism design",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware (must be added first) - using environment-aware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=security_config.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Initialize security middleware
app = init_security_middleware(app)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests with security-relevant information"""
    start_time = time.time()
    
    # Extract request details
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path} from {client_ip}")
    
    # Track security-relevant requests with enhanced monitoring
    sensitive_endpoints = [
        "/api/auth/login", "/api/auth/register", "/api/auth/reset-password",
        "/api/payments/", "/api/admin/", "/api/webhooks/"
    ]
    
    if any(request.url.path.startswith(endpoint) for endpoint in sensitive_endpoints):
        logger.warning(
            f"Security-sensitive endpoint accessed: {request.url.path} "
            f"from {client_ip} method={request.method}"
        )
        
        # Log request body size for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length", "0")
            logger.info(f"Request body size: {content_length} bytes")
    
    try:
        response = await call_next(request)
        
        # Calculate request duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"status={response.status_code} duration={duration:.3f}s"
        )
        
        # Alert on suspicious status codes
        if response.status_code == 401:
            logger.warning(f"Unauthorized access attempt: {request.url.path} from {client_ip}")
        elif response.status_code == 403:
            logger.warning(f"Forbidden access attempt: {request.url.path} from {client_ip}")
        elif response.status_code >= 500:
            logger.error(f"Server error on {request.url.path}: status={response.status_code}")
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path} "
            f"duration={duration:.3f}s error={str(e)}"
        )
        raise

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(ai.router, prefix="/api/ai", tags=["artificial-intelligence"])
app.include_router(designs.router, prefix="/api/designs", tags=["designs"])
app.include_router(pod.router, prefix="/api/pod", tags=["print-on-demand"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])

@app.get("/")
async def root():
    return {
        "message": "FlowBotz API v1.0.0",
        "status": "online",
        "docs": "/api/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
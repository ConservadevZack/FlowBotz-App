from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routes
from app.routes import auth, workflows, ai, webhooks, health

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 FlowBotz API starting up...")
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://flowbotz.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(ai.router, prefix="/api/ai", tags=["artificial-intelligence"])
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
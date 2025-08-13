"""
Test configuration and fixtures for FlowBotz API tests
"""
import pytest
import asyncio
import os
from typing import Generator
from httpx import AsyncClient
from fastapi.testclient import TestClient
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Import the FastAPI app
from main import app

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def client():
    """Create a test client for FastAPI app."""
    with TestClient(app) as client:
        yield client

@pytest.fixture
async def async_client():
    """Create an async test client for FastAPI app."""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client

@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing."""
    test_vars = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test_supabase_key",
        "SUPABASE_SERVICE_KEY": "test_service_key",
        "OPENAI_API_KEY": "test_openai_key",
        "STABILITY_API_KEY": "test_stability_key",
        "TOGETHER_API_KEY": "test_together_key",
        "STRIPE_SECRET_KEY": "sk_test_stripe_key",
        "STRIPE_WEBHOOK_SECRET": "whsec_test_webhook_secret",
        "PRINTFUL_API_KEY": "test_printful_key",
        "PRINTIFY_API_KEY": "test_printify_key",
        "PRINTIFY_WEBHOOK_SECRET": "test_printify_webhook_secret",
        "JWT_SECRET_KEY": "test_jwt_secret_key",
        "ENVIRONMENT": "testing"
    }
    
    for key, value in test_vars.items():
        monkeypatch.setenv(key, value)
    
    return test_vars

@pytest.fixture
def mock_user_token():
    """Generate a mock JWT token for testing protected endpoints."""
    from app.routes.auth import create_access_token
    return create_access_token(data={"sub": "test@example.com"})

@pytest.fixture
def auth_headers(mock_user_token):
    """Create authorization headers with mock token."""
    return {"Authorization": f"Bearer {mock_user_token}"}

@pytest.fixture
def performance_timer():
    """Timer fixture for performance testing."""
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
    
    return Timer()

@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "secure_password123",
        "full_name": "Test User"
    }

@pytest.fixture
def sample_chat_request():
    """Sample chat request data for AI testing."""
    return {
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "max_tokens": 1000
    }

@pytest.fixture
def sample_image_request():
    """Sample image generation request for AI testing."""
    return {
        "prompt": "A beautiful sunset over the ocean",
        "model": "stable-diffusion",
        "size": "1024x1024",
        "style": "photorealistic"
    }

@pytest.fixture
def sample_stripe_webhook():
    """Sample Stripe webhook payload for testing."""
    return {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_payment_intent",
                "amount": 2000,
                "currency": "usd",
                "customer": "cus_test_customer"
            }
        }
    }

@pytest.fixture
def sample_printify_webhook():
    """Sample Printify webhook payload for testing."""
    return {
        "type": "order.created",
        "data": {
            "id": "test_order_123",
            "status": "pending",
            "items": [
                {
                    "product_id": "test_product_456",
                    "quantity": 1
                }
            ]
        }
    }

# Health check helper
def wait_for_api(client, max_retries=30, delay=1):
    """Wait for API to be ready."""
    for i in range(max_retries):
        try:
            response = client.get("/api/health")
            if response.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(delay)
    return False
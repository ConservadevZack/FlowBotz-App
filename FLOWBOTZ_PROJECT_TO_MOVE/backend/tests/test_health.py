"""
Health check tests for FlowBotz API
"""
import pytest
from fastapi.testclient import TestClient

@pytest.mark.unit
def test_health_endpoint(client: TestClient):
    """Test basic health check endpoint."""
    response = client.get("/api/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["version"] == "1.0.0"
    assert "environment" in data

@pytest.mark.unit
def test_detailed_health_endpoint(client: TestClient):
    """Test detailed health check endpoint."""
    response = client.get("/api/health/detailed")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["version"] == "1.0.0"
    assert "system" in data
    assert "services" in data
    
    # Check system metrics
    system = data["system"]
    assert "cpu_percent" in system
    assert "memory" in system
    assert "disk" in system
    
    # Check memory metrics
    memory = system["memory"]
    required_memory_keys = ["total", "available", "percent", "used", "free"]
    for key in required_memory_keys:
        assert key in memory
        assert isinstance(memory[key], (int, float))

@pytest.mark.unit
def test_root_endpoint(client: TestClient):
    """Test root endpoint."""
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "message" in data
    assert "status" in data
    assert data["status"] == "online"
    assert data["docs"] == "/api/docs"

@pytest.mark.integration
@pytest.mark.performance
def test_health_response_time(client: TestClient, performance_timer):
    """Test health endpoint response time."""
    performance_timer.start()
    response = client.get("/api/health")
    performance_timer.stop()
    
    assert response.status_code == 200
    assert performance_timer.elapsed < 1.0  # Should respond within 1 second

@pytest.mark.integration
def test_api_docs_accessible(client: TestClient):
    """Test that API documentation is accessible."""
    response = client.get("/api/docs")
    assert response.status_code == 200
    
    response = client.get("/api/redoc")
    assert response.status_code == 200
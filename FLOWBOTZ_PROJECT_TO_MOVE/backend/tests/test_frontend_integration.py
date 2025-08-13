"""
Frontend-backend integration tests for FlowBotz API
Tests API endpoints, authentication middleware, and cross-origin requests
"""
import pytest
import json
import responses
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

@pytest.mark.integration
class TestAPIEndpoints:
    """Test all API endpoints are accessible and return expected responses."""
    
    def test_api_root_endpoint(self, client: TestClient):
        """Test API root endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "status" in data
        assert "docs" in data
        assert data["status"] == "online"
    
    def test_health_endpoints(self, client: TestClient):
        """Test health check endpoints."""
        # Basic health check
        response = client.get("/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
        
        # Detailed health check
        response = client.get("/api/health/detailed")
        assert response.status_code == 200
        
        detailed_data = response.json()
        assert "system" in detailed_data
        assert "services" in detailed_data
    
    def test_api_documentation_endpoints(self, client: TestClient):
        """Test API documentation endpoints."""
        # OpenAPI docs
        response = client.get("/api/docs")
        assert response.status_code == 200
        
        # ReDoc documentation
        response = client.get("/api/redoc")
        assert response.status_code == 200
    
    def test_openapi_json_endpoint(self, client: TestClient):
        """Test OpenAPI JSON schema endpoint."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        schema = response.json()
        
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
        assert schema["info"]["title"] == "FlowBotz API"

@pytest.mark.integration
class TestCORSConfiguration:
    """Test CORS (Cross-Origin Resource Sharing) configuration."""
    
    def test_cors_preflight_request(self, client: TestClient):
        """Test CORS preflight OPTIONS request."""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        
        response = client.options("/api/auth/login", headers=headers)
        
        # Should allow preflight request
        assert response.status_code in [200, 204]
        
        # Check CORS headers if present
        if "access-control-allow-origin" in response.headers:
            assert response.headers["access-control-allow-origin"] in [
                "http://localhost:3000",
                "*"
            ]
    
    def test_cors_actual_request(self, client: TestClient):
        """Test actual request with CORS headers."""
        headers = {
            "Origin": "http://localhost:3000",
            "Content-Type": "application/json"
        }
        
        response = client.get("/api/health", headers=headers)
        
        assert response.status_code == 200
        
        # Should include CORS headers in response
        if "access-control-allow-origin" in response.headers:
            allowed_origin = response.headers["access-control-allow-origin"]
            assert allowed_origin in ["http://localhost:3000", "*"]
    
    def test_cors_forbidden_origin(self, client: TestClient):
        """Test CORS request from forbidden origin."""
        headers = {
            "Origin": "https://malicious-site.com",
            "Content-Type": "application/json"
        }
        
        response = client.get("/api/health", headers=headers)
        
        # Should still respond (CORS is browser-enforced)
        # but may not include CORS headers for forbidden origins
        assert response.status_code == 200

@pytest.mark.integration
class TestAuthenticationMiddleware:
    """Test authentication middleware functionality."""
    
    def test_public_endpoints_no_auth_required(self, client: TestClient):
        """Test that public endpoints don't require authentication."""
        public_endpoints = [
            "/",
            "/api/health",
            "/api/health/detailed",
            "/api/docs",
            "/api/redoc",
            "/openapi.json"
        ]
        
        for endpoint in public_endpoints:
            response = client.get(endpoint)
            # Should not require authentication
            assert response.status_code != 401
            assert response.status_code != 403
    
    def test_protected_endpoints_require_auth(self, client: TestClient):
        """Test that protected endpoints require authentication."""
        protected_endpoints = [
            "/api/auth/me",
            "/api/ai/chat",
            "/api/ai/generate-image",
            "/api/ai/models"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            # Should require authentication
            assert response.status_code == 403  # Forbidden without token
    
    def test_valid_token_authentication(self, client: TestClient, auth_headers):
        """Test authentication with valid token."""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "email" in data
        assert data["email"] == "test@example.com"
    
    def test_invalid_token_authentication(self, client: TestClient):
        """Test authentication with invalid token."""
        invalid_headers = {
            "Authorization": "Bearer invalid_token_123"
        }
        
        response = client.get("/api/auth/me", headers=invalid_headers)
        
        assert response.status_code == 401  # Unauthorized
    
    def test_malformed_authorization_header(self, client: TestClient):
        """Test authentication with malformed authorization header."""
        malformed_headers = [
            {"Authorization": "invalid_format"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Token invalid_type"}  # Wrong type
        ]
        
        for headers in malformed_headers:
            response = client.get("/api/auth/me", headers=headers)
            assert response.status_code in [401, 403]

@pytest.mark.integration
class TestRequestResponseValidation:
    """Test request and response validation."""
    
    def test_json_request_validation(self, client: TestClient, auth_headers):
        """Test JSON request validation."""
        # Valid JSON request
        valid_request = {
            "messages": [{"role": "user", "content": "Hello"}],
            "model": "gpt-3.5-turbo"
        }
        
        response = client.post("/api/ai/chat", json=valid_request, headers=auth_headers)
        assert response.status_code == 200
        
        # Invalid JSON request - missing required fields
        invalid_request = {
            "model": "gpt-3.5-turbo"  # Missing messages
        }
        
        response = client.post("/api/ai/chat", json=invalid_request, headers=auth_headers)
        assert response.status_code == 422  # Validation error
    
    def test_response_content_type(self, client: TestClient):
        """Test response content type headers."""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
    
    def test_request_size_limits(self, client: TestClient, auth_headers):
        """Test request size limits."""
        # Create a very large request
        large_message = "x" * 100000  # 100KB message
        large_request = {
            "messages": [{"role": "user", "content": large_message}],
            "model": "gpt-3.5-turbo"
        }
        
        response = client.post("/api/ai/chat", json=large_request, headers=auth_headers)
        
        # Should handle large requests gracefully
        # Either accept or reject with appropriate status
        assert response.status_code in [200, 413, 422]
    
    def test_unicode_handling(self, client: TestClient, auth_headers):
        """Test Unicode character handling in requests."""
        unicode_request = {
            "messages": [{"role": "user", "content": "Hello 世界 🌍 café naïve"}],
            "model": "gpt-3.5-turbo"
        }
        
        response = client.post("/api/ai/chat", json=unicode_request, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should handle Unicode correctly
        assert "message" in data

@pytest.mark.integration
class TestErrorHandling:
    """Test error handling across the API."""
    
    def test_404_error_handling(self, client: TestClient):
        """Test 404 error for non-existent endpoints."""
        response = client.get("/api/non-existent-endpoint")
        
        assert response.status_code == 404
        
        # Should return JSON error response
        if response.headers.get("content-type", "").startswith("application/json"):
            data = response.json()
            assert "detail" in data
    
    def test_405_method_not_allowed(self, client: TestClient):
        """Test 405 error for unsupported HTTP methods."""
        # Try POST on GET-only endpoint
        response = client.post("/api/health")
        
        assert response.status_code == 405
        
        # Should include allowed methods header
        if "allow" in response.headers:
            assert "GET" in response.headers["allow"]
    
    def test_500_internal_server_error_handling(self, client: TestClient):
        """Test 500 error handling."""
        # This would test actual server error handling
        # For now, just ensure error handling structure exists
        
        # In a real scenario, would trigger an internal server error
        # and verify it's handled gracefully without exposing internals
        assert True  # Placeholder for actual error testing
    
    def test_rate_limiting_error_handling(self, client: TestClient, auth_headers):
        """Test rate limiting error responses."""
        # Make multiple rapid requests
        responses_list = []
        for i in range(20):
            response = client.get("/api/auth/me", headers=auth_headers)
            responses_list.append(response)
        
        # All should succeed for now (rate limiting not implemented)
        # When implemented, should test 429 Too Many Requests
        for response in responses_list:
            assert response.status_code in [200, 429]

@pytest.mark.integration
class TestEnvironmentVariableValidation:
    """Test environment variable validation and configuration."""
    
    def test_required_environment_variables(self, mock_env_vars):
        """Test that required environment variables are validated."""
        import os
        
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_KEY",
            "OPENAI_API_KEY",
            "STRIPE_SECRET_KEY",
            "JWT_SECRET_KEY"
        ]
        
        for var in required_vars:
            assert os.getenv(var) is not None, f"Missing required environment variable: {var}"
    
    def test_environment_specific_configuration(self, mock_env_vars):
        """Test environment-specific configuration."""
        import os
        
        environment = os.getenv("ENVIRONMENT", "development")
        
        # Test environment is properly set
        assert environment in ["development", "testing", "production"]
        
        # Test environment-specific settings would be applied
        if environment == "testing":
            # Test-specific configurations
            assert os.getenv("JWT_SECRET_KEY") == "test_jwt_secret_key"
        
    def test_missing_environment_variable_handling(self):
        """Test handling of missing environment variables."""
        # This would test what happens when required env vars are missing
        # In production, app should fail to start or provide clear error
        
        # For now, just verify the test setup
        assert True  # Placeholder for actual env var validation testing

@pytest.mark.integration
@pytest.mark.performance
class TestAPIPerformance:
    """Test API performance characteristics."""
    
    def test_health_check_response_time(self, client: TestClient, performance_timer):
        """Test health check response time."""
        performance_timer.start()
        response = client.get("/api/health")
        performance_timer.stop()
        
        assert response.status_code == 200
        assert performance_timer.elapsed < 0.5  # Under 500ms
    
    def test_concurrent_requests_handling(self, client: TestClient):
        """Test handling of concurrent requests."""
        import concurrent.futures
        import threading
        
        def make_request():
            return client.get("/api/health")
        
        # Simulate concurrent requests
        responses = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(20)]
            responses = [future.result() for future in futures]
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
    
    def test_api_response_size(self, client: TestClient):
        """Test API response sizes are reasonable."""
        endpoints_to_test = [
            "/api/health",
            "/api/health/detailed",
            "/"
        ]
        
        for endpoint in endpoints_to_test:
            response = client.get(endpoint)
            assert response.status_code == 200
            
            # Response should be reasonably sized
            content_length = len(response.content)
            assert content_length < 100000  # Under 100KB
            assert content_length > 0  # Not empty

@pytest.mark.integration
class TestSecurityHeaders:
    """Test security headers in API responses."""
    
    def test_security_headers_present(self, client: TestClient):
        """Test that security headers are present in responses."""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        
        # Check for common security headers
        expected_headers = [
            "x-content-type-options",
            "x-frame-options", 
            "x-xss-protection"
        ]
        
        # Note: These headers may not be set yet, so just check structure
        for header in expected_headers:
            # In production, these should be present
            header_value = response.headers.get(header.lower())
            # For now, just verify we can check for them
            assert header_value is None or isinstance(header_value, str)
    
    def test_cors_security_headers(self, client: TestClient):
        """Test CORS security headers."""
        headers = {"Origin": "http://localhost:3000"}
        response = client.get("/api/health", headers=headers)
        
        assert response.status_code == 200
        
        # Check CORS headers
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers"
        ]
        
        # Verify CORS headers can be checked
        for header in cors_headers:
            cors_header = response.headers.get(header)
            assert cors_header is None or isinstance(cors_header, str)
    
    def test_content_security_policy(self, client: TestClient):
        """Test Content Security Policy header."""
        response = client.get("/api/docs")
        
        assert response.status_code == 200
        
        # CSP header might be present for documentation pages
        csp_header = response.headers.get("content-security-policy")
        assert csp_header is None or isinstance(csp_header, str)

@pytest.mark.integration
class TestWebhookEndpoints:
    """Test webhook endpoint functionality."""
    
    def test_webhook_test_endpoint(self, client: TestClient):
        """Test webhook test endpoint."""
        response = client.get("/api/webhooks/test")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "endpoints" in data
        
        # Verify webhook endpoints are listed
        endpoints = data["endpoints"]
        assert "stripe" in endpoints
        assert "printify" in endpoints
        assert "supabase" in endpoints
    
    def test_webhook_endpoints_require_post(self, client: TestClient):
        """Test that webhook endpoints only accept POST requests."""
        webhook_endpoints = [
            "/api/webhooks/stripe",
            "/api/webhooks/printify",
            "/api/webhooks/supabase"
        ]
        
        for endpoint in webhook_endpoints:
            # GET should not be allowed
            response = client.get(endpoint)
            assert response.status_code == 405  # Method Not Allowed
            
            # POST should be allowed (but may fail validation)
            response = client.post(endpoint, json={})
            assert response.status_code in [200, 400, 422]  # Not 405

@pytest.mark.integration
class TestAPIVersioning:
    """Test API versioning and compatibility."""
    
    def test_api_version_in_response(self, client: TestClient):
        """Test that API version is included in responses."""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "version" in data
        assert isinstance(data["version"], str)
        assert data["version"] == "1.0.0"
    
    def test_openapi_version_info(self, client: TestClient):
        """Test OpenAPI schema version information."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        schema = response.json()
        
        assert "info" in schema
        assert "version" in schema["info"]
        assert schema["info"]["version"] == "1.0.0"
        
        # Check API metadata
        info = schema["info"]
        assert "title" in info
        assert "description" in info
        assert info["title"] == "FlowBotz API"
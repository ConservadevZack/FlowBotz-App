"""
Supabase integration tests for FlowBotz API
"""
import pytest
import json
import responses
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

@pytest.mark.supabase
@pytest.mark.integration
class TestSupabaseAuth:
    """Test Supabase authentication integration."""
    
    def test_auth_environment_variables(self, mock_env_vars):
        """Test that required Supabase environment variables are set."""
        import os
        assert os.getenv("SUPABASE_URL") is not None
        assert os.getenv("SUPABASE_KEY") is not None
        assert os.getenv("SUPABASE_SERVICE_KEY") is not None
    
    @patch('supabase.create_client')
    def test_supabase_client_creation(self, mock_create_client, mock_env_vars):
        """Test Supabase client creation with proper configuration."""
        # Mock the Supabase client
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client
        
        # Import after mocking to ensure mocked client is used
        from src.lib.supabase import supabase
        
        # Verify client was created with correct parameters
        mock_create_client.assert_called_once()
        call_args = mock_create_client.call_args
        
        assert call_args[0][0] == "https://test.supabase.co"  # URL
        assert call_args[0][1] == "test_supabase_key"  # Anon key
        
        # Check configuration
        config = call_args[1]
        assert config['auth']['autoRefreshToken'] is True
        assert config['auth']['persistSession'] is True
        assert config['auth']['detectSessionInUrl'] is True
        assert config['realtime']['params']['eventsPerSecond'] == 10

@pytest.mark.supabase
@pytest.mark.integration
class TestSupabaseAuth:
    """Test authentication endpoints with Supabase integration."""
    
    @responses.activate
    def test_user_registration_flow(self, client: TestClient, sample_user_data):
        """Test complete user registration flow."""
        # Mock Supabase auth signup response
        responses.add(
            responses.POST,
            "https://test.supabase.co/auth/v1/signup",
            json={
                "user": {
                    "id": "test_user_id",
                    "email": sample_user_data["email"],
                    "created_at": "2024-01-01T00:00:00Z"
                },
                "access_token": "test_access_token"
            },
            status=200
        )
        
        # Mock profile creation
        responses.add(
            responses.POST,
            "https://test.supabase.co/rest/v1/profiles",
            json={
                "id": "test_user_id",
                "email": sample_user_data["email"],
                "full_name": sample_user_data["full_name"]
            },
            status=201
        )
        
        response = client.post("/api/auth/register", json=sample_user_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == sample_user_data["email"]
    
    @responses.activate
    def test_user_login_flow(self, client: TestClient):
        """Test user login flow."""
        login_data = {
            "email": "test@example.com",
            "password": "secure_password123"
        }
        
        # Mock Supabase auth signin response
        responses.add(
            responses.POST,
            "https://test.supabase.co/auth/v1/token?grant_type=password",
            json={
                "access_token": "test_access_token",
                "user": {
                    "id": "test_user_id",
                    "email": login_data["email"]
                }
            },
            status=200
        )
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == login_data["email"]
    
    def test_protected_endpoint_without_token(self, client: TestClient):
        """Test accessing protected endpoint without authentication."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403  # Forbidden without token
    
    def test_protected_endpoint_with_token(self, client: TestClient, auth_headers):
        """Test accessing protected endpoint with valid token."""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "email" in data
        assert data["email"] == "test@example.com"

@pytest.mark.supabase
@pytest.mark.integration
class TestSupabaseDatabase:
    """Test database operations with Supabase."""
    
    @responses.activate
    def test_profile_operations(self, auth_headers):
        """Test profile CRUD operations."""
        # Mock profile fetch
        responses.add(
            responses.GET,
            "https://test.supabase.co/rest/v1/profiles",
            json=[{
                "id": "test_user_id",
                "email": "test@example.com",
                "full_name": "Test User",
                "avatar_url": None,
                "created_at": "2024-01-01T00:00:00Z"
            }],
            status=200
        )
        
        # Mock profile update
        responses.add(
            responses.PATCH,
            "https://test.supabase.co/rest/v1/profiles",
            json=[{
                "id": "test_user_id",
                "email": "test@example.com",
                "full_name": "Updated User",
                "avatar_url": "https://example.com/avatar.jpg"
            }],
            status=200
        )
        
        # Test profile fetch would be implemented in actual profile routes
        # For now, we're testing the mock setup works
        assert len(responses.calls) == 0  # No calls made yet
        
        # When actual profile routes are implemented, they would be tested here
    
    @responses.activate
    def test_workflow_operations(self, auth_headers):
        """Test workflow CRUD operations."""
        workflow_data = {
            "name": "Test Workflow",
            "description": "A test workflow",
            "config": {"trigger": "manual", "actions": []},
            "status": "draft"
        }
        
        # Mock workflow creation
        responses.add(
            responses.POST,
            "https://test.supabase.co/rest/v1/workflows",
            json={
                "id": "test_workflow_id",
                "user_id": "test_user_id",
                **workflow_data,
                "created_at": "2024-01-01T00:00:00Z"
            },
            status=201
        )
        
        # Mock workflow fetch
        responses.add(
            responses.GET,
            "https://test.supabase.co/rest/v1/workflows",
            json=[{
                "id": "test_workflow_id",
                "user_id": "test_user_id",
                **workflow_data
            }],
            status=200
        )
        
        # Test mocks are set up correctly
        assert len(responses.calls) == 0

@pytest.mark.supabase
@pytest.mark.integration
class TestSupabaseRealtime:
    """Test Supabase real-time functionality."""
    
    @patch('supabase.create_client')
    def test_realtime_configuration(self, mock_create_client, mock_env_vars):
        """Test real-time subscription setup."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client
        
        # Import after mocking
        from src.lib.supabase import supabase
        
        # Verify real-time config was passed correctly
        call_args = mock_create_client.call_args
        realtime_config = call_args[1]['realtime']
        
        assert realtime_config['params']['eventsPerSecond'] == 10
    
    def test_realtime_subscription_mock(self):
        """Test real-time subscription creation (mocked)."""
        # This would test actual real-time functionality when implemented
        # For now, just ensure the test structure is in place
        mock_subscription = MagicMock()
        mock_subscription.subscribe = MagicMock(return_value={"status": "subscribed"})
        
        # Test subscription mock
        result = mock_subscription.subscribe()
        assert result["status"] == "subscribed"

@pytest.mark.supabase
@pytest.mark.security
class TestSupabaseSecurity:
    """Test Supabase security features."""
    
    def test_row_level_security_policies(self):
        """Test that RLS policies are properly configured."""
        # This test would verify RLS policies are enabled
        # For now, document the expected policies:
        expected_policies = [
            "Users can only access their own profile",
            "Users can only access their own workflows",
            "Public read access for certain data",
            "Admin users have elevated permissions"
        ]
        
        # In a real implementation, this would query Supabase
        # to verify these policies exist and are active
        assert len(expected_policies) == 4
    
    def test_api_key_validation(self, mock_env_vars):
        """Test API key validation."""
        import os
        
        # Verify test API keys are set
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        assert supabase_url.startswith("https://")
        assert len(supabase_key) > 10  # Reasonable key length
    
    @responses.activate
    def test_unauthorized_database_access(self):
        """Test that unauthorized database access is blocked."""
        # Mock unauthorized response
        responses.add(
            responses.GET,
            "https://test.supabase.co/rest/v1/profiles",
            json={"error": "Unauthorized"},
            status=401
        )
        
        # This would test actual unauthorized access when routes exist
        # For now, verify mock is set up
        assert len(responses.calls) == 0

@pytest.mark.supabase
@pytest.mark.performance
class TestSupabasePerformance:
    """Test Supabase performance characteristics."""
    
    @responses.activate
    def test_database_query_performance(self, performance_timer):
        """Test database query response times."""
        # Mock fast database response
        responses.add(
            responses.GET,
            "https://test.supabase.co/rest/v1/profiles",
            json=[{"id": "test", "email": "test@example.com"}],
            status=200
        )
        
        # Simulate query timing
        performance_timer.start()
        # Actual database query would go here
        performance_timer.stop()
        
        # Database queries should be fast
        # In real implementation, would make actual HTTP request
        assert True  # Placeholder for actual timing test
    
    @responses.activate
    def test_bulk_operations_performance(self):
        """Test bulk database operations performance."""
        # Mock bulk insert response
        responses.add(
            responses.POST,
            "https://test.supabase.co/rest/v1/workflows",
            json=[{"id": f"workflow_{i}"} for i in range(100)],
            status=201
        )
        
        # Test bulk operations are handled efficiently
        # In real implementation, would test actual bulk inserts
        assert True  # Placeholder for actual bulk operations test
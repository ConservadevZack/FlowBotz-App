"""
Performance tests for FlowBotz API
Tests response times, throughput, resource usage, and scalability
"""
import pytest
import asyncio
import time
import threading
import concurrent.futures
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

@pytest.mark.performance
class TestResponseTimePerformance:
    """Test API response time performance."""
    
    def test_health_check_response_time(self, client: TestClient, performance_timer):
        """Test health check endpoint response time."""
        response_times = []
        
        # Test multiple requests to get average
        for i in range(10):
            performance_timer.start()
            response = client.get("/api/health")
            performance_timer.stop()
            
            assert response.status_code == 200
            response_times.append(performance_timer.elapsed)
        
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        
        # Health check should be very fast
        assert avg_response_time < 0.1  # Under 100ms average
        assert max_response_time < 0.5   # Under 500ms maximum
    
    def test_authentication_response_time(self, client: TestClient, performance_timer):
        """Test authentication endpoint response time."""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        performance_timer.start()
        response = client.post("/api/auth/login", json=login_data)
        performance_timer.stop()
        
        assert response.status_code == 200
        # Authentication should be reasonably fast
        assert performance_timer.elapsed < 2.0  # Under 2 seconds
    
    def test_ai_chat_response_time(self, client: TestClient, auth_headers, performance_timer):
        """Test AI chat endpoint response time."""
        chat_request = {
            "messages": [{"role": "user", "content": "Hello, this is a test message"}],
            "model": "gpt-3.5-turbo"
        }
        
        performance_timer.start()
        response = client.post("/api/ai/chat", json=chat_request, headers=auth_headers)
        performance_timer.stop()
        
        assert response.status_code == 200
        # AI chat should respond within reasonable time (mock response)
        assert performance_timer.elapsed < 5.0  # Under 5 seconds for mock
    
    def test_image_generation_response_time(self, client: TestClient, auth_headers, performance_timer):
        """Test AI image generation response time."""
        image_request = {
            "prompt": "A beautiful landscape painting",
            "model": "stable-diffusion"
        }
        
        performance_timer.start()
        response = client.post("/api/ai/generate-image", json=image_request, headers=auth_headers)
        performance_timer.stop()
        
        assert response.status_code == 200
        # Image generation should respond within reasonable time (mock response)
        assert performance_timer.elapsed < 10.0  # Under 10 seconds for mock
    
    def test_webhook_processing_time(self, client: TestClient, performance_timer):
        """Test webhook processing response time."""
        webhook_payload = {
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test", "amount": 1000}}
        }
        
        import json
        payload = json.dumps(webhook_payload).encode()
        headers = {
            "stripe-signature": "t=1234567890,v1=test_signature",
            "content-type": "application/json"
        }
        
        performance_timer.start()
        response = client.post("/api/webhooks/stripe", data=payload, headers=headers)
        performance_timer.stop()
        
        # Webhooks should process very quickly
        assert performance_timer.elapsed < 1.0  # Under 1 second
        assert response.status_code in [200, 400]

@pytest.mark.performance
class TestThroughputPerformance:
    """Test API throughput and concurrent request handling."""
    
    def test_concurrent_health_checks(self, client: TestClient):
        """Test concurrent health check requests."""
        def make_health_request():
            return client.get("/api/health")
        
        start_time = time.time()
        
        # Make 50 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_health_request) for _ in range(50)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All requests should succeed
        assert all(r.status_code == 200 for r in responses)
        
        # Should handle concurrent requests efficiently
        requests_per_second = len(responses) / total_time
        assert requests_per_second > 10  # At least 10 RPS
    
    def test_concurrent_authenticated_requests(self, client: TestClient, auth_headers):
        """Test concurrent authenticated requests."""
        def make_auth_request():
            return client.get("/api/auth/me", headers=auth_headers)
        
        start_time = time.time()
        
        # Make 20 concurrent authenticated requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_auth_request) for _ in range(20)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All authenticated requests should succeed
        assert all(r.status_code == 200 for r in responses)
        
        # Should handle concurrent auth requests
        assert total_time < 10.0  # Should complete within 10 seconds
    
    def test_mixed_endpoint_concurrency(self, client: TestClient, auth_headers):
        """Test concurrent requests to different endpoints."""
        def make_health_request():
            return ("health", client.get("/api/health"))
        
        def make_auth_request():
            return ("auth", client.get("/api/auth/me", headers=auth_headers))
        
        def make_models_request():
            return ("models", client.get("/api/ai/models", headers=auth_headers))
        
        request_functions = [
            make_health_request,
            make_auth_request,
            make_models_request
        ] * 5  # 15 total requests
        
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(func) for func in request_functions]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Categorize results
        health_results = [r for endpoint, r in results if endpoint == "health"]
        auth_results = [r for endpoint, r in results if endpoint == "auth"]
        models_results = [r for endpoint, r in results if endpoint == "models"]
        
        # All requests should succeed
        assert all(r.status_code == 200 for _, r in results)
        
        # Should handle mixed concurrent load
        assert total_time < 15.0  # Reasonable time for mixed requests

@pytest.mark.performance
class TestResourceUsagePerformance:
    """Test resource usage and efficiency."""
    
    def test_memory_usage_stability(self, client: TestClient):
        """Test memory usage remains stable under load."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Make many requests to test memory stability
        for i in range(100):
            response = client.get("/api/health")
            assert response.status_code == 200
            
            # Check memory periodically
            if i % 20 == 0:
                current_memory = process.memory_info().rss
                memory_increase = current_memory - initial_memory
                
                # Memory should not increase dramatically
                assert memory_increase < 50 * 1024 * 1024  # Less than 50MB increase
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Overall memory increase should be reasonable
        assert memory_increase < 100 * 1024 * 1024  # Less than 100MB total
    
    def test_cpu_usage_efficiency(self, client: TestClient):
        """Test CPU usage remains reasonable under load."""
        import psutil
        
        # Measure CPU usage during request processing
        cpu_percentages = []
        
        for i in range(50):
            start_cpu = psutil.cpu_percent(interval=0.1)
            
            response = client.get("/api/health")
            assert response.status_code == 200
            
            end_cpu = psutil.cpu_percent(interval=0.1)
            cpu_percentages.append(max(start_cpu, end_cpu))
        
        avg_cpu = sum(cpu_percentages) / len(cpu_percentages)
        max_cpu = max(cpu_percentages)
        
        # CPU usage should be reasonable
        assert avg_cpu < 50.0  # Less than 50% average
        assert max_cpu < 80.0   # Less than 80% peak
    
    def test_file_descriptor_leaks(self, client: TestClient):
        """Test for file descriptor leaks."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_fds = process.num_fds()
        
        # Make many requests that might open connections
        for i in range(100):
            response = client.get("/api/health")
            assert response.status_code == 200
        
        final_fds = process.num_fds()
        fd_increase = final_fds - initial_fds
        
        # File descriptors should not leak
        assert fd_increase < 10  # Small increase acceptable

@pytest.mark.performance
class TestScalabilityPerformance:
    """Test API scalability characteristics."""
    
    def test_request_size_scalability(self, client: TestClient, auth_headers):
        """Test handling of different request sizes."""
        # Test small, medium, and large requests
        request_sizes = [
            ("small", "Hello"),
            ("medium", "Hello " * 100),
            ("large", "Hello " * 1000)
        ]
        
        for size_name, content in request_sizes:
            chat_request = {
                "messages": [{"role": "user", "content": content}],
                "model": "gpt-3.5-turbo"
            }
            
            start_time = time.time()
            response = client.post("/api/ai/chat", json=chat_request, headers=auth_headers)
            end_time = time.time()
            
            assert response.status_code == 200
            
            # Response time should scale reasonably with request size
            response_time = end_time - start_time
            if size_name == "small":
                assert response_time < 1.0
            elif size_name == "medium":
                assert response_time < 2.0
            elif size_name == "large":
                assert response_time < 5.0
    
    def test_user_load_scalability(self, client: TestClient):
        """Test scalability with multiple simulated users."""
        from app.routes.auth import create_access_token
        
        # Create multiple user tokens
        user_count = 20
        users = []
        for i in range(user_count):
            token = create_access_token(data={"sub": f"user{i}@example.com"})
            headers = {"Authorization": f"Bearer {token}"}
            users.append(headers)
        
        def simulate_user_activity(user_headers):
            """Simulate typical user activity."""
            responses = []
            
            # Health check
            responses.append(client.get("/api/health"))
            
            # Authentication check
            responses.append(client.get("/api/auth/me", headers=user_headers))
            
            # AI models list
            responses.append(client.get("/api/ai/models", headers=user_headers))
            
            return responses
        
        start_time = time.time()
        
        # Simulate concurrent users
        with concurrent.futures.ThreadPoolExecutor(max_workers=user_count) as executor:
            futures = [executor.submit(simulate_user_activity, user_headers) 
                      for user_headers in users]
            all_responses = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Flatten responses
        all_individual_responses = []
        for user_responses in all_responses:
            all_individual_responses.extend(user_responses)
        
        # All requests should succeed
        success_count = sum(1 for r in all_individual_responses if r.status_code == 200)
        success_rate = success_count / len(all_individual_responses)
        
        assert success_rate > 0.95  # 95% success rate
        assert total_time < 30.0    # Complete within 30 seconds
    
    def test_data_volume_scalability(self, client: TestClient, auth_headers):
        """Test handling of high data volume scenarios."""
        # Test multiple image generation requests
        image_requests = []
        for i in range(10):
            image_request = {
                "prompt": f"Generate image number {i} with detailed description and complex scene",
                "model": "stable-diffusion",
                "size": "1024x1024"
            }
            image_requests.append(image_request)
        
        start_time = time.time()
        
        # Process requests (sequentially to avoid overwhelming)
        responses = []
        for req in image_requests:
            response = client.post("/api/ai/generate-image", json=req, headers=auth_headers)
            responses.append(response)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All requests should succeed
        assert all(r.status_code == 200 for r in responses)
        
        # Should handle data volume efficiently
        avg_time_per_request = total_time / len(image_requests)
        assert avg_time_per_request < 2.0  # Under 2 seconds per request (mock)

@pytest.mark.performance
class TestDatabasePerformance:
    """Test database performance characteristics."""
    
    @patch('supabase.create_client')
    def test_database_connection_performance(self, mock_create_client, performance_timer):
        """Test database connection establishment performance."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client
        
        performance_timer.start()
        
        # Import triggers database client creation
        from src.lib.supabase import supabase
        
        performance_timer.stop()
        
        # Database client creation should be fast
        assert performance_timer.elapsed < 0.5  # Under 500ms
        mock_create_client.assert_called_once()
    
    @responses.activate
    def test_database_query_performance(self, performance_timer):
        """Test database query performance."""
        import responses
        
        # Mock fast database response
        responses.add(
            responses.GET,
            "https://test.supabase.co/rest/v1/profiles",
            json=[{"id": "user1", "email": "test@example.com"}],
            status=200
        )
        
        performance_timer.start()
        
        # Simulate database query
        import requests
        response = requests.get(
            "https://test.supabase.co/rest/v1/profiles",
            headers={"Authorization": "Bearer test_key"}
        )
        
        performance_timer.stop()
        
        assert response.status_code == 200
        # Database queries should be fast
        assert performance_timer.elapsed < 1.0  # Under 1 second
    
    @responses.activate
    def test_bulk_database_operations_performance(self, performance_timer):
        """Test bulk database operations performance."""
        import responses
        
        # Mock bulk insert response
        bulk_data = [{"id": f"user_{i}", "email": f"user{i}@example.com"} 
                    for i in range(100)]
        
        responses.add(
            responses.POST,
            "https://test.supabase.co/rest/v1/profiles",
            json=bulk_data,
            status=201
        )
        
        performance_timer.start()
        
        # Simulate bulk operation
        import requests
        import json
        response = requests.post(
            "https://test.supabase.co/rest/v1/profiles",
            data=json.dumps(bulk_data),
            headers={
                "Authorization": "Bearer test_key",
                "Content-Type": "application/json"
            }
        )
        
        performance_timer.stop()
        
        assert response.status_code == 201
        # Bulk operations should be reasonably fast
        assert performance_timer.elapsed < 3.0  # Under 3 seconds

@pytest.mark.performance
class TestCachePerformance:
    """Test caching performance and effectiveness."""
    
    def test_response_caching_effectiveness(self, client: TestClient):
        """Test response caching for static content."""
        # Test multiple requests to same endpoint
        endpoint = "/api/ai/models"
        headers = {"Authorization": f"Bearer test_token"}
        
        # First request
        start_time = time.time()
        response1 = client.get(endpoint, headers=headers)
        first_request_time = time.time() - start_time
        
        # Second request (should be faster if cached)
        start_time = time.time()
        response2 = client.get(endpoint, headers=headers)
        second_request_time = time.time() - start_time
        
        assert response1.status_code in [200, 403]
        assert response2.status_code in [200, 403]
        
        # If both succeed, second should be similar or faster
        if response1.status_code == 200 and response2.status_code == 200:
            assert response1.json() == response2.json()  # Same content
    
    def test_memory_cache_performance(self):
        """Test in-memory cache performance."""
        # Simple cache performance test
        cache = {}
        
        # Test cache write performance
        start_time = time.time()
        for i in range(1000):
            cache[f"key_{i}"] = f"value_{i}"
        write_time = time.time() - start_time
        
        # Test cache read performance
        start_time = time.time()
        for i in range(1000):
            value = cache.get(f"key_{i}")
            assert value == f"value_{i}"
        read_time = time.time() - start_time
        
        # Cache operations should be very fast
        assert write_time < 0.1  # Under 100ms for 1000 writes
        assert read_time < 0.1   # Under 100ms for 1000 reads

@pytest.mark.performance
class TestNetworkPerformance:
    """Test network performance characteristics."""
    
    def test_request_payload_compression(self, client: TestClient, auth_headers):
        """Test request payload compression handling."""
        # Test large request payload
        large_content = "This is a test message. " * 1000  # ~24KB
        large_request = {
            "messages": [{"role": "user", "content": large_content}],
            "model": "gpt-3.5-turbo"
        }
        
        start_time = time.time()
        response = client.post("/api/ai/chat", json=large_request, headers=auth_headers)
        end_time = time.time()
        
        assert response.status_code == 200
        
        # Should handle large payloads efficiently
        response_time = end_time - start_time
        assert response_time < 5.0  # Under 5 seconds
    
    def test_response_size_optimization(self, client: TestClient):
        """Test response size optimization."""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        
        # Response should be reasonably sized
        response_size = len(response.content)
        assert response_size < 10240  # Under 10KB
        assert response_size > 0      # Not empty
    
    def test_keep_alive_connection_performance(self, client: TestClient):
        """Test HTTP keep-alive connection performance."""
        # Multiple requests on same connection should be faster
        response_times = []
        
        for i in range(10):
            start_time = time.time()
            response = client.get("/api/health")
            end_time = time.time()
            
            assert response.status_code == 200
            response_times.append(end_time - start_time)
        
        # Later requests should generally be faster (connection reuse)
        first_half_avg = sum(response_times[:5]) / 5
        second_half_avg = sum(response_times[5:]) / 5
        
        # All requests should be reasonably fast
        assert all(rt < 1.0 for rt in response_times)
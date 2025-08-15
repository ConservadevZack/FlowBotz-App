#!/usr/bin/env python3
"""
POD Integration Test Script
Tests the fixes for Printful and Printify API integrations
"""

import asyncio
import json
import httpx
import sys
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000/api"
TEST_TOKEN = "dev-token"  # Use the development bypass token

class PODIntegrationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = {
            "Authorization": f"Bearer {TEST_TOKEN}",
            "Content-Type": "application/json"
        }
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        result = f"[{timestamp}] {status} {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": timestamp
        })

    async def test_health_check(self):
        """Test basic API health"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/health")
                success = response.status_code == 200
                self.log_test("Health Check", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False

    async def test_pod_categories(self):
        """Test POD categories endpoint"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/pod/categories")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    categories_count = len(data)
                    self.log_test("POD Categories", success, f"Found {categories_count} categories")
                else:
                    self.log_test("POD Categories", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("POD Categories", False, f"Error: {str(e)}")
            return False

    async def test_printful_products(self):
        """Test Printful products endpoint"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/pod/products?provider=printful&category=apparel")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    products_count = len(data) if isinstance(data, list) else 0
                    self.log_test("Printful Products", success, f"Found {products_count} products")
                else:
                    self.log_test("Printful Products", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Printful Products", False, f"Error: {str(e)}")
            return False

    async def test_printify_products(self):
        """Test Printify products endpoint"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/pod/products?provider=printify&category=apparel")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    products_count = len(data) if isinstance(data, list) else 0
                    # Check if we got the 'list has no get attribute' error
                    if products_count > 0:
                        self.log_test("Printify Products", success, f"Found {products_count} products")
                    else:
                        # Check response text for error indicators
                        response_text = response.text
                        if "list" in response_text and "get" in response_text:
                            self.log_test("Printify Products", False, "Still has 'list has no get attribute' error")
                        else:
                            self.log_test("Printify Products", success, "No products but no error")
                else:
                    self.log_test("Printify Products", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Printify Products", False, f"Error: {str(e)}")
            return False

    async def test_unified_products(self):
        """Test unified products endpoint (both providers)"""
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.get(f"{self.base_url}/pod/products/unified?category=apparel")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    total_products = data.get("total_products", 0)
                    providers = data.get("providers", [])
                    self.log_test("Unified Products", success, f"Found {total_products} products from {len(providers)} providers")
                else:
                    self.log_test("Unified Products", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Unified Products", False, f"Error: {str(e)}")
            return False

    async def test_mockup_status(self):
        """Test mockup service status"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/mockup/mockup-status")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    printful_status = data.get("printful_api", "unknown")
                    printify_status = data.get("printify_api", "unknown")
                    self.log_test("Mockup Status", success, f"Printful: {printful_status}, Printify: {printify_status}")
                else:
                    self.log_test("Mockup Status", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Mockup Status", False, f"Error: {str(e)}")
            return False

    async def test_product_specs(self):
        """Test product specifications endpoint"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Test with a common product ID
                response = await client.get(f"{self.base_url}/pod/product-specs/655")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    specifications = data.get("specifications", {})
                    product_type = specifications.get("type", "unknown")
                    self.log_test("Product Specs", success, f"Product type: {product_type}")
                else:
                    self.log_test("Product Specs", success, f"Status: {response.status_code}")
                return success
        except Exception as e:
            self.log_test("Product Specs", False, f"Error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all POD integration tests"""
        print("🧪 Starting POD Integration Tests...")
        print("=" * 60)
        
        tests = [
            self.test_health_check,
            self.test_pod_categories,
            self.test_printful_products,
            self.test_printify_products,
            self.test_unified_products,
            self.test_mockup_status,
            self.test_product_specs
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                success = await test()
                if success:
                    passed += 1
                await asyncio.sleep(1)  # Brief pause between tests
            except Exception as e:
                self.log_test(f"Test {test.__name__}", False, f"Unexpected error: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"🏁 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All POD integration tests PASSED!")
        else:
            print(f"⚠️  {total - passed} tests failed - check logs above")
            
        return passed == total

async def main():
    """Main test runner"""
    tester = PODIntegrationTester()
    success = await tester.run_all_tests()
    
    if not success:
        sys.exit(1)
    
    print("\n✅ POD API integrations are working correctly!")

if __name__ == "__main__":
    asyncio.run(main())
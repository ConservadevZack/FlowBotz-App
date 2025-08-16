#!/usr/bin/env python3
"""
Test script for POD endpoints to verify functionality
"""
import asyncio
import httpx
import json
import os
import sys
from dotenv import load_dotenv

# Load environment variables (same as server)
load_dotenv()

# Add the backend directory to the path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Import POD functions directly
from app.routes.pod import get_printful_products, get_printify_products, get_mock_products

async def test_pod_functions():
    """Test POD functions directly without authentication"""
    
    print("🧪 Testing POD Integration Functions")
    print("=" * 50)
    
    # Test Printful products
    print("\n1. Testing Printful Products...")
    try:
        printful_products = await get_printful_products("apparel")
        print(f"✅ Printful returned {len(printful_products)} products")
        if printful_products:
            first_product = printful_products[0]
            print(f"   First product: {first_product.name}")
            print(f"   Image URL: {first_product.image[:80]}...")
            print(f"   Variants: {len(first_product.variants)}")
    except Exception as e:
        print(f"❌ Printful test failed: {str(e)}")
    
    # Test Printify products
    print("\n2. Testing Printify Products...")
    try:
        printify_products = await get_printify_products("apparel")
        print(f"✅ Printify returned {len(printify_products)} products")
        if printify_products:
            first_product = printify_products[0]
            print(f"   First product: {first_product.name}")
            print(f"   Image URL: {first_product.image[:80]}...")
            print(f"   Variants: {len(first_product.variants)}")
    except Exception as e:
        print(f"❌ Printify test failed: {str(e)}")
    
    # Test mock products
    print("\n3. Testing Mock Products...")
    try:
        mock_products = get_mock_products()
        print(f"✅ Mock returned {len(mock_products)} products")
        if mock_products:
            first_product = mock_products[0]
            print(f"   First product: {first_product.name}")
            print(f"   Image URL: {first_product.image}")
            print(f"   Variants: {len(first_product.variants)}")
    except Exception as e:
        print(f"❌ Mock test failed: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 POD Integration Test Complete!")

async def test_api_endpoints():
    """Test POD API endpoints via HTTP requests"""
    
    print("\n🌐 Testing POD API Endpoints")
    print("=" * 50)
    
    base_url = "http://127.0.0.1:8000"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test categories endpoint (requires auth)
        try:
            response = await client.get(f"{base_url}/api/pod/categories")
            if response.status_code == 401:
                print("✅ Categories endpoint exists (requires authentication as expected)")
            elif response.status_code == 200:
                data = response.json()
                print(f"✅ Categories endpoint working: {len(data)} categories")
            else:
                print(f"❌ Categories endpoint unexpected status: {response.status_code}")
        except Exception as e:
            print(f"❌ Categories endpoint error: {str(e)}")
    
    print("Note: Other endpoints require authentication and will be tested via frontend integration")

if __name__ == "__main__":
    asyncio.run(test_pod_functions())
    asyncio.run(test_api_endpoints())
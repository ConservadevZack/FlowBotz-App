#!/usr/bin/env python3
"""Simple test script to verify FlowBotz backend is running and accessible"""

import requests
import json

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get('http://localhost:8000/api/health', timeout=5)
        print(f"✅ Health endpoint: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health endpoint failed: {e}")
        return False

def test_auth_endpoint():
    """Test auth endpoints"""
    try:
        response = requests.get('http://localhost:8000/api/auth/verify', timeout=5)
        print(f"✅ Auth endpoint accessible: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Auth endpoint failed: {e}")
        return False

def test_ai_models():
    """Test AI models endpoint"""
    try:
        response = requests.get('http://localhost:8000/api/ai/models', timeout=5)
        print(f"✅ AI models endpoint: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ AI models endpoint failed: {e}")
        return False

def test_root_endpoint():
    """Test root endpoint"""
    try:
        response = requests.get('http://localhost:8000/', timeout=5)
        print(f"✅ Root endpoint: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False

def main():
    print("🚀 Testing FlowBotz Backend Connection...")
    print("-" * 50)
    
    tests = [
        test_root_endpoint,
        test_backend_health,
        test_auth_endpoint,
        test_ai_models
    ]
    
    results = []
    for test in tests:
        results.append(test())
        print()
    
    passed = sum(results)
    total = len(results)
    
    print("-" * 50)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All backend endpoints are accessible!")
    else:
        print("❌ Some backend endpoints are failing. Check if the backend server is running:")
        print("   cd backend && python main.py")
    
    return passed == total

if __name__ == "__main__":
    main()
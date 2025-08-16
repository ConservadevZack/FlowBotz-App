"""
Test POD Webhook System
Test the POD webhook handlers and order tracking functionality
"""

import asyncio
import json
import httpx
from datetime import datetime

# Test webhook payloads
PRINTFUL_ORDER_CREATED = {
    "type": "order_created",
    "data": {
        "id": "12345",
        "status": "pending",
        "external_id": "flowbotz_20250816_123456",
        "shipping": "STANDARD",
        "costs": {
            "total": "25.99"
        },
        "recipient": {
            "name": "John Doe",
            "address1": "123 Main St",
            "city": "Austin",
            "state_code": "TX",
            "country_code": "US",
            "zip": "78701"
        }
    }
}

PRINTFUL_PACKAGE_SHIPPED = {
    "type": "package_shipped",
    "data": {
        "order_id": "12345",
        "tracking_number": "1Z999AA123456789",
        "tracking_url": "https://www.ups.com/track?TrackingNumber=1Z999AA123456789",
        "carrier": "UPS",
        "shipment_date": "2025-08-16"
    }
}

PRINTIFY_ORDER_CREATED = {
    "type": "order:created",
    "data": {
        "id": "67890",
        "status": "pending",
        "external_id": "flowbotz_20250816_123457",
        "line_items": [
            {
                "product_id": "54321",
                "variant_id": "98765",
                "quantity": 1
            }
        ]
    }
}

PRINTIFY_ORDER_SHIPPED = {
    "type": "order:shipment:created",
    "data": {
        "id": "67890",
        "status": "shipped",
        "tracking_number": "1Z999BB987654321",
        "tracking_url": "https://www.fedex.com/track?TrackingNumber=1Z999BB987654321",
        "carrier": "FedEx"
    }
}

async def test_webhook_endpoints():
    """Test webhook endpoints"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test Printful webhooks
        print("🧪 Testing Printful webhooks...")
        
        try:
            # Test order created
            response = await client.post(
                f"{base_url}/api/webhooks/printful",
                json=PRINTFUL_ORDER_CREATED,
                headers={"Content-Type": "application/json"}
            )
            print(f"✅ Printful order created: {response.status_code}")
            
            # Test package shipped
            response = await client.post(
                f"{base_url}/api/webhooks/printful",
                json=PRINTFUL_PACKAGE_SHIPPED,
                headers={"Content-Type": "application/json"}
            )
            print(f"✅ Printful package shipped: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Printful webhook test failed: {e}")
        
        # Test Printify webhooks
        print("\n🧪 Testing Printify webhooks...")
        
        try:
            # Test order created
            response = await client.post(
                f"{base_url}/api/webhooks/printify",
                json=PRINTIFY_ORDER_CREATED,
                headers={"Content-Type": "application/json"}
            )
            print(f"✅ Printify order created: {response.status_code}")
            
            # Test order shipped
            response = await client.post(
                f"{base_url}/api/webhooks/printify",
                json=PRINTIFY_ORDER_SHIPPED,
                headers={"Content-Type": "application/json"}
            )
            print(f"✅ Printify order shipped: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Printify webhook test failed: {e}")

async def test_pod_apis():
    """Test POD API endpoints"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        print("\n🧪 Testing POD API endpoints...")
        
        try:
            # Test webhook test endpoint
            response = await client.get(f"{base_url}/api/webhooks/test")
            print(f"✅ Webhook test endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Endpoints: {list(data.get('endpoints', {}).keys())}")
            
        except Exception as e:
            print(f"❌ POD API test failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting POD Webhook Tests...")
    print("="*50)
    
    asyncio.run(test_pod_apis())
    asyncio.run(test_webhook_endpoints())
    
    print("\n" + "="*50)
    print("✅ POD Webhook Tests Complete!")
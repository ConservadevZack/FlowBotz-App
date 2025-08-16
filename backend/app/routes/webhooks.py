from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
import stripe
import hashlib
import hmac
import os
import json
from datetime import datetime
from ..database import db_service

router = APIRouter()

# Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
printify_webhook_secret = os.getenv("PRINTIFY_WEBHOOK_SECRET")
printful_webhook_secret = os.getenv("PRINTFUL_WEBHOOK_SECRET")

class WebhookEvent(BaseModel):
    type: str
    data: Dict[str, Any]
    source: str

class PODOrderUpdate(BaseModel):
    pod_order_id: str
    status: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery: Optional[str] = None
    provider: str

def verify_stripe_webhook(payload: bytes, sig_header: str, secret: str) -> bool:
    """Verify Stripe webhook signature"""
    try:
        stripe.Webhook.construct_event(payload, sig_header, secret)
        return True
    except ValueError:
        return False
    except stripe.error.SignatureVerificationError:
        return False

def verify_printify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Printify webhook signature"""
    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    payload = await request.body()
    
    if not verify_stripe_webhook(payload, stripe_signature, stripe_webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    event_type = event['type']
    event_data = event['data']['object']
    
    # Handle different Stripe events
    if event_type == 'payment_intent.succeeded':
        # Handle successful payment
        payment_intent_id = event_data['id']
        amount = event_data['amount']
        customer_id = event_data['customer']
        
        # TODO: Update user subscription status
        print(f"Payment succeeded: {payment_intent_id}, Amount: {amount}")
        
    elif event_type == 'customer.subscription.created':
        # Handle new subscription
        subscription_id = event_data['id']
        customer_id = event_data['customer']
        status = event_data['status']
        
        # TODO: Activate user features
        print(f"Subscription created: {subscription_id}, Status: {status}")
        
    elif event_type == 'customer.subscription.deleted':
        # Handle subscription cancellation
        subscription_id = event_data['id']
        customer_id = event_data['customer']
        
        # TODO: Deactivate user features
        print(f"Subscription cancelled: {subscription_id}")
        
    elif event_type == 'invoice.payment_failed':
        # Handle failed payment
        invoice_id = event_data['id']
        customer_id = event_data['customer']
        
        # TODO: Send payment failure notification
        print(f"Payment failed for invoice: {invoice_id}")
    
    return {"status": "success"}

@router.post("/printify")
async def printify_webhook(
    request: Request,
    x_printify_signature: str = Header(None, alias="x-printify-signature")
):
    """Handle Printify webhook events for order tracking"""
    payload = await request.body()
    
    if not verify_printify_webhook(payload, x_printify_signature, printify_webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get('type')
    event_data = event.get('data', {})
    
    print(f"📦 Printify webhook: {event_type} for order {event_data.get('id')}")
    
    # Handle different Printify events
    if event_type == 'order:created':
        await handle_printify_order_created(event_data)
    elif event_type == 'order:updated':
        await handle_printify_order_updated(event_data)
    elif event_type == 'order:sent_to_production':
        await handle_printify_order_production(event_data)
    elif event_type == 'order:shipment:created':
        await handle_printify_order_shipped(event_data)
    elif event_type == 'order:shipment:delivered':
        await handle_printify_order_delivered(event_data)
    elif event_type == 'order:canceled':
        await handle_printify_order_canceled(event_data)
    
    return {"status": "success"}

@router.post("/supabase")
async def supabase_webhook(request: Request):
    """Handle Supabase webhook events (database changes)"""
    payload = await request.body()
    
    try:
        import json
        event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get('type')
    table = event.get('table')
    record = event.get('record', {})
    old_record = event.get('old_record', {})
    
    # Handle different database events
    if event_type == 'INSERT' and table == 'profiles':
        # Handle new user registration
        user_id = record.get('id')
        email = record.get('email')
        
        # TODO: Send welcome email, setup default workflows
        print(f"New user registered: {user_id}, Email: {email}")
        
    elif event_type == 'UPDATE' and table == 'workflows':
        # Handle workflow updates
        workflow_id = record.get('id')
        status = record.get('status')
        old_status = old_record.get('status')
        
        if status != old_status:
            # TODO: Handle workflow status changes
            print(f"Workflow status changed: {workflow_id}, {old_status} -> {status}")
    
    return {"status": "success"}

@router.post("/printful")
async def printful_webhook(
    request: Request,
    x_pf_signature: str = Header(None, alias="x-pf-signature")
):
    """Handle Printful webhook events for order tracking"""
    payload = await request.body()
    
    if printful_webhook_secret and not verify_printful_webhook(payload, x_pf_signature, printful_webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get('type')
    event_data = event.get('data', {})
    
    print(f"📦 Printful webhook: {event_type} for order {event_data.get('id')}")
    
    # Handle different Printful events
    if event_type == 'order_created':
        await handle_printful_order_created(event_data)
    elif event_type == 'order_updated':
        await handle_printful_order_updated(event_data)
    elif event_type == 'order_failed':
        await handle_printful_order_failed(event_data)
    elif event_type == 'order_canceled':
        await handle_printful_order_canceled(event_data)
    elif event_type == 'package_shipped':
        await handle_printful_package_shipped(event_data)
    elif event_type == 'package_returned':
        await handle_printful_package_returned(event_data)
    
    return {"status": "success"}

# POD Order Event Handlers
async def handle_printify_order_created(order_data: Dict[str, Any]):
    """Handle Printify order creation"""
    try:
        pod_order_id = str(order_data.get('id'))
        status = order_data.get('status', 'pending')
        
        # Update our database with Printify order ID
        await update_order_by_pod_id(pod_order_id, {
            'status': map_printify_status(status),
            'pod_order_id': pod_order_id,
            'provider': 'printify',
            'provider_status': status,
            'provider_data': order_data,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Updated order {pod_order_id} status: {status}")
        
    except Exception as e:
        print(f"❌ Error handling Printify order created: {e}")

async def handle_printify_order_updated(order_data: Dict[str, Any]):
    """Handle Printify order updates"""
    try:
        pod_order_id = str(order_data.get('id'))
        status = order_data.get('status', 'pending')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': map_printify_status(status),
            'provider_status': status,
            'provider_data': order_data,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Updated order {pod_order_id} status: {status}")
        
    except Exception as e:
        print(f"❌ Error handling Printify order updated: {e}")

async def handle_printify_order_production(order_data: Dict[str, Any]):
    """Handle Printify order sent to production"""
    try:
        pod_order_id = str(order_data.get('id'))
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'in_production',
            'provider_status': 'sent_to_production',
            'production_started_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Order {pod_order_id} sent to production")
        
    except Exception as e:
        print(f"❌ Error handling Printify production: {e}")

async def handle_printify_order_shipped(order_data: Dict[str, Any]):
    """Handle Printify order shipment"""
    try:
        pod_order_id = str(order_data.get('id'))
        tracking_number = order_data.get('tracking_number')
        tracking_url = order_data.get('tracking_url')
        carrier = order_data.get('carrier')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'shipped',
            'provider_status': 'shipped',
            'tracking_number': tracking_number,
            'tracking_url': tracking_url,
            'carrier': carrier,
            'shipped_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        # TODO: Send shipping notification to customer
        print(f"✅ Order {pod_order_id} shipped with tracking: {tracking_number}")
        
    except Exception as e:
        print(f"❌ Error handling Printify shipment: {e}")

async def handle_printify_order_delivered(order_data: Dict[str, Any]):
    """Handle Printify order delivery"""
    try:
        pod_order_id = str(order_data.get('id'))
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'delivered',
            'provider_status': 'delivered',
            'delivered_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Order {pod_order_id} delivered")
        
    except Exception as e:
        print(f"❌ Error handling Printify delivery: {e}")

async def handle_printify_order_canceled(order_data: Dict[str, Any]):
    """Handle Printify order cancellation"""
    try:
        pod_order_id = str(order_data.get('id'))
        reason = order_data.get('reason', 'Unknown')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'canceled',
            'provider_status': 'canceled',
            'cancellation_reason': reason,
            'canceled_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Order {pod_order_id} canceled: {reason}")
        
    except Exception as e:
        print(f"❌ Error handling Printify cancellation: {e}")

# Printful Event Handlers
async def handle_printful_order_created(order_data: Dict[str, Any]):
    """Handle Printful order creation"""
    try:
        pod_order_id = str(order_data.get('id'))
        status = order_data.get('status', 'draft')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': map_printful_status(status),
            'pod_order_id': pod_order_id,
            'provider': 'printful',
            'provider_status': status,
            'provider_data': order_data,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Updated Printful order {pod_order_id} status: {status}")
        
    except Exception as e:
        print(f"❌ Error handling Printful order created: {e}")

async def handle_printful_order_updated(order_data: Dict[str, Any]):
    """Handle Printful order updates"""
    try:
        pod_order_id = str(order_data.get('id'))
        status = order_data.get('status', 'draft')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': map_printful_status(status),
            'provider_status': status,
            'provider_data': order_data,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Updated Printful order {pod_order_id} status: {status}")
        
    except Exception as e:
        print(f"❌ Error handling Printful order updated: {e}")

async def handle_printful_order_failed(order_data: Dict[str, Any]):
    """Handle Printful order failure"""
    try:
        pod_order_id = str(order_data.get('id'))
        reason = order_data.get('error', {}).get('message', 'Unknown error')
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'failed',
            'provider_status': 'failed',
            'error_message': reason,
            'failed_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"❌ Printful order {pod_order_id} failed: {reason}")
        
    except Exception as e:
        print(f"❌ Error handling Printful failure: {e}")

async def handle_printful_order_canceled(order_data: Dict[str, Any]):
    """Handle Printful order cancellation"""
    try:
        pod_order_id = str(order_data.get('id'))
        
        await update_order_by_pod_id(pod_order_id, {
            'status': 'canceled',
            'provider_status': 'canceled',
            'canceled_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Printful order {pod_order_id} canceled")
        
    except Exception as e:
        print(f"❌ Error handling Printful cancellation: {e}")

async def handle_printful_package_shipped(package_data: Dict[str, Any]):
    """Handle Printful package shipment"""
    try:
        order_id = str(package_data.get('order_id'))
        tracking_number = package_data.get('tracking_number')
        tracking_url = package_data.get('tracking_url')
        carrier = package_data.get('carrier')
        
        await update_order_by_pod_id(order_id, {
            'status': 'shipped',
            'provider_status': 'shipped',
            'tracking_number': tracking_number,
            'tracking_url': tracking_url,
            'carrier': carrier,
            'shipped_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"✅ Printful package shipped for order {order_id}: {tracking_number}")
        
    except Exception as e:
        print(f"❌ Error handling Printful shipment: {e}")

async def handle_printful_package_returned(package_data: Dict[str, Any]):
    """Handle Printful package return"""
    try:
        order_id = str(package_data.get('order_id'))
        reason = package_data.get('reason', 'Unknown')
        
        await update_order_by_pod_id(order_id, {
            'status': 'returned',
            'provider_status': 'returned',
            'return_reason': reason,
            'returned_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        print(f"📦 Printful package returned for order {order_id}: {reason}")
        
    except Exception as e:
        print(f"❌ Error handling Printful return: {e}")

# Helper Functions
def verify_printful_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Printful webhook signature"""
    if not secret or not signature:
        return True  # Skip verification if not configured
    
    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

def map_printify_status(status: str) -> str:
    """Map Printify status to our internal status"""
    status_mapping = {
        'pending': 'pending',
        'in_production': 'in_production',
        'sent_to_production': 'in_production',
        'fulfilled': 'shipped',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'canceled': 'canceled',
        'on_hold': 'on_hold'
    }
    return status_mapping.get(status.lower(), 'pending')

def map_printful_status(status: str) -> str:
    """Map Printful status to our internal status"""
    status_mapping = {
        'draft': 'pending',
        'pending': 'pending', 
        'confirmed': 'confirmed',
        'inprocess': 'in_production',
        'onhold': 'on_hold',
        'partial': 'partial',
        'fulfilled': 'shipped',
        'canceled': 'canceled',
        'failed': 'failed'
    }
    return status_mapping.get(status.lower(), 'pending')

async def update_order_by_pod_id(pod_order_id: str, updates: Dict[str, Any]):
    """Update order in database using POD order ID"""
    try:
        # Find order by POD order ID in metadata
        result = db_service.supabase.table("orders").select("*").execute()
        
        for order in result.data:
            metadata = order.get('metadata', {})
            products = metadata.get('products', [])
            
            # Check if any product has this POD order ID
            for product in products:
                if product.get('pod_order_id') == pod_order_id:
                    # Update the order
                    db_service.supabase.table("orders").update(updates).eq("id", order['id']).execute()
                    
                    # Track the status update
                    if 'status' in updates:
                        await db_service.track_event(
                            user_id=order.get('user_id'),
                            event_type="pod",
                            event_action="order_status_updated",
                            properties={
                                "order_id": order['id'],
                                "pod_order_id": pod_order_id,
                                "new_status": updates['status'],
                                "provider": updates.get('provider', 'unknown')
                            }
                        )
                    return True
        
        print(f"⚠️  No order found for POD order ID: {pod_order_id}")
        return False
        
    except Exception as e:
        print(f"❌ Error updating order by POD ID {pod_order_id}: {e}")
        return False

@router.get("/test")
async def test_webhook():
    """Test endpoint for webhook functionality"""
    return {
        "message": "Webhook endpoints are active",
        "endpoints": {
            "stripe": "/api/webhooks/stripe",
            "printify": "/api/webhooks/printify",
            "printful": "/api/webhooks/printful",
            "supabase": "/api/webhooks/supabase"
        }
    }
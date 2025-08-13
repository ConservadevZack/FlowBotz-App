from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
import stripe
import hashlib
import hmac
import os

router = APIRouter()

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Printify configuration
printify_webhook_secret = os.getenv("PRINTIFY_WEBHOOK_SECRET")

class WebhookEvent(BaseModel):
    type: str
    data: Dict[str, Any]
    source: str

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
    """Handle Printify webhook events"""
    payload = await request.body()
    
    if not verify_printify_webhook(payload, x_printify_signature, printify_webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        import json
        event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get('type')
    event_data = event.get('data', {})
    
    # Handle different Printify events
    if event_type == 'order.created':
        # Handle new order
        order_id = event_data.get('id')
        status = event_data.get('status')
        
        # TODO: Update order status in database
        print(f"Printify order created: {order_id}, Status: {status}")
        
    elif event_type == 'order.updated':
        # Handle order updates
        order_id = event_data.get('id')
        status = event_data.get('status')
        
        # TODO: Update order status and notify user
        print(f"Printify order updated: {order_id}, Status: {status}")
        
    elif event_type == 'order.shipped':
        # Handle order shipment
        order_id = event_data.get('id')
        tracking_number = event_data.get('tracking_number')
        
        # TODO: Send shipping notification to user
        print(f"Printify order shipped: {order_id}, Tracking: {tracking_number}")
    
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

@router.get("/test")
async def test_webhook():
    """Test endpoint for webhook functionality"""
    return {
        "message": "Webhook endpoints are active",
        "endpoints": {
            "stripe": "/api/webhooks/stripe",
            "printify": "/api/webhooks/printify", 
            "supabase": "/api/webhooks/supabase"
        }
    }
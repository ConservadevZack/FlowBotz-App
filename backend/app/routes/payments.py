from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import stripe
import logging
from datetime import datetime
import json
import hmac
import hashlib

# Import security modules
try:
    from security.auth import get_current_active_user, require_premium
    from security.validation import ValidatedPaymentIntentRequest, ValidatedSubscriptionRequest, ValidatedProductPurchaseRequest
    from security.database import audit_logger
    from app.routes.auth import verify_token
    SECURITY_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Security modules not available: {e}")
    SECURITY_MODULES_AVAILABLE = False
    
    # Fallback verify_token function
    async def verify_token(credentials=None):
        return {"user_id": "fallback-user", "email": "test@example.com"}

# Remove duplicate router and stripe initialization

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Stripe with error handling
try:
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        logger.warning("STRIPE_SECRET_KEY not configured")
    else:
        stripe.api_key = stripe_key
except Exception as e:
    logger.error(f"Failed to initialize Stripe: {e}")

# Define models (fallback for when security modules not available)
class PaymentIntentRequest(BaseModel):
    amount: int  # Amount in cents
    currency: str = "usd"
    metadata: Optional[Dict[str, str]] = {}
    automatic_payment_methods: bool = True

class SubscriptionRequest(BaseModel):
    price_id: str
    metadata: Optional[Dict[str, str]] = {}

class ProductPurchaseRequest(BaseModel):
    product_id: str
    variant_id: str
    quantity: int = 1
    design_url: str
    shipping_address: Dict[str, str]
    customer_email: str

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: int
    currency: str
    status: str

class SubscriptionResponse(BaseModel):
    subscription_id: str
    client_secret: Optional[str] = None
    status: str
    current_period_end: Optional[int] = None

class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[int] = None  # If None, refund full amount
    reason: Optional[str] = "requested_by_customer"

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: ValidatedPaymentIntentRequest if SECURITY_MODULES_AVAILABLE else PaymentIntentRequest,
    current_user = Depends(get_current_active_user),
    http_request: Request = None
):
    """Create a secure Stripe payment intent for one-time payments"""
    client_ip = http_request.headers.get("x-forwarded-for", http_request.client.host) if http_request else "unknown"
    
    # Validate Stripe is configured
    if not stripe.api_key or stripe.api_key == "your-stripe-secret-key":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment processing not configured"
        )
    
    # Log payment attempt
    if SECURITY_MODULES_AVAILABLE:
        audit_logger.log_database_access(
            user_id=current_user["user_id"],
            operation="PAYMENT_INTENT_CREATE",
            table="payments",
            conditions={
                "amount": request.amount,
                "currency": request.currency,
                "client_ip": client_ip
            },
            success=True
        )
    try:
        # Additional amount validation
        if request.amount < 50:  # Minimum $0.50
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount too small (minimum $0.50)"
            )
        
        if request.amount > 100000000:  # Maximum $1M
            if SECURITY_MODULES_AVAILABLE:
                audit_logger.log_security_violation(
                    user_id=current_user["user_id"],
                    violation_type="LARGE_PAYMENT_ATTEMPT",
                    details={"amount": request.amount, "client_ip": client_ip},
                    severity="HIGH"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount too large (maximum $1,000,000)"
            )
        
        # Get or create Stripe customer with enhanced error handling
        customer = await get_or_create_stripe_customer(current_user)
        
        # Sanitize metadata
        safe_metadata = {
            "user_id": current_user["user_id"],
            "client_ip": client_ip,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add user metadata safely
        if hasattr(request, 'metadata') and request.metadata:
            for key, value in request.metadata.items():
                if len(str(key)) <= 40 and len(str(value)) <= 500:
                    safe_metadata[f"user_{key[:30]}"] = str(value)[:500]
        
        # Create payment intent with enhanced security
        intent = stripe.PaymentIntent.create(
            amount=request.amount,
            currency=request.currency,
            customer=customer.id,
            metadata=safe_metadata,
            automatic_payment_methods={
                "enabled": request.automatic_payment_methods
            },
            setup_future_usage="off_session" if current_user.get("role") == "premium" else None
        )
        
        return PaymentIntentResponse(
            client_secret=intent.client_secret,
            payment_intent_id=intent.id,
            amount=intent.amount,
            currency=intent.currency,
            status=intent.status
        )
        
    except stripe.StripeError as e:
        logger.error(f"Stripe error for user {current_user['user_id']}: {e}")
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_security_violation(
                user_id=current_user["user_id"],
                violation_type="STRIPE_ERROR",
                details={"error": str(e), "amount": request.amount},
                severity="MEDIUM"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment processing error. Please try again."
        )
    except Exception as e:
        logger.error(f"Payment intent creation failed for user {current_user['user_id']}: {e}")
        if SECURITY_MODULES_AVAILABLE:
            audit_logger.log_security_violation(
                user_id=current_user["user_id"],
                violation_type="PAYMENT_SYSTEM_ERROR",
                details={"error": str(e), "amount": request.amount},
                severity="HIGH"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment system temporarily unavailable"
        )

@router.post("/create-subscription", response_model=SubscriptionResponse)
async def create_subscription(
    request: SubscriptionRequest,
    current_user = Depends(verify_token)
):
    """Create a Stripe subscription for recurring payments"""
    try:
        # Get or create Stripe customer
        customer = await get_or_create_stripe_customer(current_user)
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{
                "price": request.price_id
            }],
            metadata={
                "user_id": current_user["user_id"],
                **request.metadata
            },
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"]
        )
        
        return SubscriptionResponse(
            subscription_id=subscription.id,
            client_secret=subscription.latest_invoice.payment_intent.client_secret,
            status=subscription.status
        )
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subscription creation failed: {str(e)}")

@router.post("/purchase-product")
async def purchase_product(
    request: ProductPurchaseRequest,
    current_user = Depends(verify_token)
):
    """Create payment intent for product purchase with POD integration"""
    try:
        # Get product details from POD provider
        from .pod import get_printful_products, get_printify_products
        
        # This is a simplified example - in production you'd need to:
        # 1. Fetch exact product pricing from POD provider
        # 2. Calculate shipping costs
        # 3. Apply any discounts or taxes
        # 4. Store order details for fulfillment
        
        # For now, use a base price calculation
        base_price = 2499  # $24.99 in cents
        quantity = request.quantity
        shipping_cost = 499  # $4.99 shipping
        total_amount = (base_price * quantity) + shipping_cost
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency="usd",
            metadata={
                "user_id": current_user["user_id"],
                "product_id": request.product_id,
                "variant_id": request.variant_id,
                "quantity": str(request.quantity),
                "design_url": request.design_url,
                "order_type": "product_purchase"
            },
            automatic_payment_methods={"enabled": True}
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": total_amount,
            "breakdown": {
                "product_cost": base_price * quantity,
                "shipping_cost": shipping_cost,
                "total": total_amount
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Product purchase failed: {str(e)}")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature")
        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        if not endpoint_secret:
            raise HTTPException(status_code=400, detail="Webhook secret not configured")
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle different event types
        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            await handle_successful_payment(payment_intent)
            
        elif event["type"] == "payment_intent.payment_failed":
            payment_intent = event["data"]["object"]
            await handle_failed_payment(payment_intent)
            
        elif event["type"] == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            await handle_subscription_payment(invoice)
            
        elif event["type"] == "customer.subscription.created":
            subscription = event["data"]["object"]
            await handle_subscription_created(subscription)
            
        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            await handle_subscription_updated(subscription)
            
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            await handle_subscription_cancelled(subscription)
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"❌ Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Webhook failed: {str(e)}")

@router.post("/refund")
async def create_refund(
    request: RefundRequest,
    current_user = Depends(verify_token)
):
    """Create a refund for a payment"""
    try:
        # Get payment intent to verify ownership
        payment_intent = stripe.PaymentIntent.retrieve(request.payment_intent_id)
        
        if payment_intent.metadata.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to refund this payment")
        
        # Create refund
        refund = stripe.Refund.create(
            payment_intent=request.payment_intent_id,
            amount=request.amount,
            reason=request.reason,
            metadata={
                "refunded_by": current_user["user_id"],
                "refund_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "refund_id": refund.id,
            "amount": refund.amount,
            "status": refund.status,
            "created": refund.created
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refund failed: {str(e)}")

@router.get("/payment-history")
async def get_payment_history(
    limit: int = 10,
    starting_after: Optional[str] = None,
    current_user = Depends(verify_token)
):
    """Get user's payment history"""
    try:
        # Get customer
        customer = await get_or_create_stripe_customer(current_user)
        
        # Get payment intents for this customer
        payments = stripe.PaymentIntent.list(
            customer=customer.id,
            limit=limit,
            starting_after=starting_after
        )
        
        return {
            "payments": [
                {
                    "id": payment.id,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "status": payment.status,
                    "created": payment.created,
                    "metadata": payment.metadata
                }
                for payment in payments.data
            ],
            "has_more": payments.has_more
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get payment history: {str(e)}")

@router.get("/subscription-status")
async def get_subscription_status(current_user = Depends(verify_token)):
    """Get user's current subscription status"""
    try:
        customer = await get_or_create_stripe_customer(current_user)
        
        # Get active subscriptions
        subscriptions = stripe.Subscription.list(
            customer=customer.id,
            status="active"
        )
        
        if subscriptions.data:
            subscription = subscriptions.data[0]  # Get first active subscription
            return {
                "has_subscription": True,
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "plan_name": subscription.items.data[0].price.nickname or "Unknown Plan",
                "amount": subscription.items.data[0].price.unit_amount,
                "interval": subscription.items.data[0].price.recurring.interval
            }
        else:
            return {"has_subscription": False}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}")

# Helper functions
async def get_or_create_stripe_customer(user_data):
    """Get existing Stripe customer or create new one"""
    user_email = user_data.get("email")
    user_id = user_data.get("user_id")
    
    # Try to find existing customer
    customers = stripe.Customer.list(email=user_email, limit=1)
    
    if customers.data:
        return customers.data[0]
    
    # Create new customer
    customer = stripe.Customer.create(
        email=user_email,
        metadata={"user_id": user_id}
    )
    
    return customer

async def handle_successful_payment(payment_intent):
    """Handle successful payment webhook"""
    print(f"✅ Payment succeeded: {payment_intent['id']}")
    
    # If this is a product purchase, trigger POD order creation
    if payment_intent.get("metadata", {}).get("order_type") == "product_purchase":
        await create_pod_order(payment_intent)

async def handle_failed_payment(payment_intent):
    """Handle failed payment webhook"""
    print(f"❌ Payment failed: {payment_intent['id']}")

async def handle_subscription_payment(invoice):
    """Handle successful subscription payment"""
    print(f"✅ Subscription payment succeeded: {invoice['id']}")

async def handle_subscription_created(subscription):
    """Handle new subscription creation"""
    print(f"✅ Subscription created: {subscription['id']}")

async def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    print(f"📝 Subscription updated: {subscription['id']}")

async def handle_subscription_cancelled(subscription):
    """Handle subscription cancellation"""
    print(f"❌ Subscription cancelled: {subscription['id']}")

async def create_pod_order(payment_intent):
    """Create order with POD provider after successful payment"""
    try:
        metadata = payment_intent.get("metadata", {})
        
        # Extract order details from metadata
        product_id = metadata.get("product_id")
        variant_id = metadata.get("variant_id")
        design_url = metadata.get("design_url")
        quantity = int(metadata.get("quantity", 1))
        
        # TODO: Implement actual POD order creation
        # This would involve:
        # 1. Determining which POD provider to use (Printful vs Printify)
        # 2. Creating the product with the design
        # 3. Submitting the order
        # 4. Storing order tracking information
        
        print(f"🎨 Creating POD order for payment: {payment_intent['id']}")
        print(f"   Product: {product_id}, Variant: {variant_id}")
        print(f"   Design: {design_url}, Quantity: {quantity}")
        
    except Exception as e:
        print(f"❌ POD order creation failed: {str(e)}")
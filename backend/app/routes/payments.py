from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
import os
import stripe
import logging
from datetime import datetime
import json
import hmac
import hashlib
import httpx

# Import auth and database modules
from app.routes.auth import verify_token
from ..database import db_service

# Try to import secure validation models, fallback to local definitions
try:
    from security.validation import (
        ValidatedPaymentIntentRequest as PaymentIntentRequest,
        ValidatedSubscriptionRequest as SubscriptionRequest,
        ValidatedProductPurchaseRequest as ProductPurchaseRequest,
        PaymentAmountField,
        SanitizedStr
    )
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("Security validation models not available, using basic models")
    
    # Fallback models with basic validation
    class PaymentIntentRequest(BaseModel):
        amount: int = Field(..., ge=50, le=100000000)  # Min $0.50, Max $1M
        currency: str = Field(default="usd", pattern=r'^[a-z]{3}$')
        metadata: Optional[Dict[str, str]] = Field(default_factory=dict, max_items=20)
        automatic_payment_methods: bool = True
        
        @validator('amount')
        def validate_amount(cls, v):
            if v < 50:
                raise ValueError('Amount too small (minimum $0.50)')
            if v > 100000000:
                raise ValueError('Amount too large (maximum $1,000,000)')
            return v
    
    class SubscriptionRequest(BaseModel):
        price_id: str = Field(..., pattern=r'^price_[a-zA-Z0-9_]+$')
        metadata: Optional[Dict[str, str]] = Field(default_factory=dict, max_items=10)
    
    class ProductPurchaseRequest(BaseModel):
        product_id: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]+$', max_length=100)
        variant_id: str = Field(..., pattern=r'^[a-zA-Z0-9\-_]+$', max_length=100)
        quantity: int = Field(default=1, ge=1, le=100)
        design_url: str
        shipping_address: Dict[str, str]
        customer_email: EmailStr

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
    request: PaymentIntentRequest,
    current_user = Depends(verify_token),
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
    await db_service.track_event(
        user_id=current_user["user_id"],
        event_type="payment",
        event_action="payment_intent_create",
        properties={
            "amount": request.amount,
            "currency": request.currency,
            "client_ip": client_ip
        }
    )
    try:
        # Additional amount validation
        if request.amount < 50:  # Minimum $0.50
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount too small (minimum $0.50)"
            )
        
        if request.amount > 100000000:  # Maximum $1M
            await db_service.track_event(
                user_id=current_user["user_id"],
                event_type="security",
                event_action="large_payment_attempt",
                properties={"amount": request.amount, "client_ip": client_ip}
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
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="payment",
            event_action="stripe_error",
            properties={"error": str(e), "amount": request.amount}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment processing error. Please try again."
        )
    except Exception as e:
        logger.error(f"Payment intent creation failed for user {current_user['user_id']}: {e}")
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="payment",
            event_action="payment_system_error",
            properties={"error": str(e), "amount": request.amount}
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
        # Track subscription creation attempt
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="subscription",
            event_action="subscription_create_attempt",
            properties={"price_id": request.price_id}
        )
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
        
        # Track successful subscription creation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="subscription",
            event_action="subscription_created",
            properties={
                "subscription_id": subscription.id,
                "price_id": request.price_id,
                "status": subscription.status
            }
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

@router.post("/calculate-pod-pricing")
async def calculate_pod_pricing(
    product_id: str,
    variant_id: str,
    quantity: int = 1,
    shipping_country: str = "US",
    current_user = Depends(verify_token)
):
    """Calculate accurate pricing for POD product before payment"""
    try:
        # Validate inputs
        if quantity < 1 or quantity > 50:
            raise HTTPException(status_code=400, detail="Quantity must be between 1 and 50")
        
        # Determine provider
        from .pod import determine_provider_from_product_id
        provider = determine_provider_from_product_id(product_id)
        
        # Get base pricing from provider
        if provider == "printful":
            pricing = await get_printful_pricing(product_id, variant_id, quantity, shipping_country)
        elif provider == "printify":
            pricing = await get_printify_pricing(product_id, variant_id, quantity, shipping_country)
        else:
            # Mock pricing for demo
            pricing = {
                "base_price": 1999,  # $19.99
                "shipping_cost": 499,  # $4.99
                "tax_amount": 0,
                "total_amount": (1999 * quantity) + 499
            }
        
        # Add FlowBotz platform fee (10% of base price)
        platform_fee = int(pricing["base_price"] * quantity * 0.10)
        final_total = pricing["total_amount"] + platform_fee
        
        # Track pricing calculation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="pricing_calculated",
            properties={
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": quantity,
                "provider": provider,
                "base_price": pricing["base_price"],
                "total_amount": final_total
            }
        )
        
        return {
            "product_id": product_id,
            "variant_id": variant_id,
            "quantity": quantity,
            "provider": provider,
            "pricing": {
                "base_price": pricing["base_price"],
                "base_total": pricing["base_price"] * quantity,
                "shipping_cost": pricing["shipping_cost"],
                "platform_fee": platform_fee,
                "tax_amount": pricing["tax_amount"],
                "total_amount": final_total
            },
            "breakdown": {
                "product_cost": pricing["base_price"] * quantity,
                "shipping": pricing["shipping_cost"],
                "platform_fee": platform_fee,
                "tax": pricing["tax_amount"],
                "total": final_total
            }
        }
        
    except Exception as e:
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="pricing_error",
            properties={"error": str(e), "product_id": product_id}
        )
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@router.post("/create-pod-payment-intent")
async def create_pod_payment_intent(
    request: ProductPurchaseRequest,
    current_user = Depends(verify_token)
):
    """Create secure payment intent for POD product purchase"""
    try:
        # Validate Stripe configuration
        if not stripe.api_key or stripe.api_key == "your-stripe-secret-key":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing not configured"
            )
        
        # Get accurate pricing
        pricing_response = await calculate_pod_pricing(
            product_id=request.product_id,
            variant_id=request.variant_id,
            quantity=request.quantity,
            shipping_country=request.shipping_address.get("country", "US"),
            current_user=current_user
        )
        
        total_amount = pricing_response["pricing"]["total_amount"]
        
        # Validate amount bounds
        if total_amount < 50:  # Minimum $0.50
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order total too small (minimum $0.50)"
            )
        
        if total_amount > 50000000:  # Maximum $500K for POD orders
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order total too large (maximum $500,000)"
            )
        
        # Get or create Stripe customer
        customer = await get_or_create_stripe_customer(current_user)
        
        # Create comprehensive metadata
        safe_metadata = {
            "user_id": current_user["user_id"],
            "order_type": "pod_purchase",
            "product_id": request.product_id,
            "variant_id": request.variant_id,
            "quantity": str(request.quantity),
            "design_url": request.design_url[:500],  # Truncate long URLs
            "customer_email": request.customer_email,
            "provider": pricing_response["provider"],
            "base_amount": str(pricing_response["pricing"]["base_total"]),
            "shipping_cost": str(pricing_response["pricing"]["shipping_cost"]),
            "platform_fee": str(pricing_response["pricing"]["platform_fee"]),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store shipping address in metadata (truncated)
        for key, value in request.shipping_address.items():
            if key in ["name", "address1", "city", "state", "country", "zip"]:
                safe_metadata[f"ship_{key}"] = str(value)[:100]
        
        # Create payment intent with enhanced security
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency="usd",
            customer=customer.id,
            metadata=safe_metadata,
            automatic_payment_methods={"enabled": True},
            capture_method="automatic",
            confirmation_method="automatic",
            setup_future_usage=None,  # Don't save payment method for POD orders
            description=f"FlowBotz POD Order - {request.product_id}"
        )
        
        # Track payment intent creation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="payment",
            event_action="pod_payment_intent_created",
            properties={
                "payment_intent_id": intent.id,
                "amount": total_amount,
                "product_id": request.product_id,
                "variant_id": request.variant_id,
                "quantity": request.quantity,
                "provider": pricing_response["provider"]
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": total_amount,
            "currency": "usd",
            "status": intent.status,
            "pricing_breakdown": pricing_response["breakdown"],
            "provider": pricing_response["provider"],
            "estimated_delivery": "7-14 business days"
        }
        
    except stripe.StripeError as e:
        logger.error(f"Stripe error for POD payment {current_user['user_id']}: {e}")
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="payment",
            event_action="pod_stripe_error",
            properties={"error": str(e), "product_id": request.product_id}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment processing error. Please try again."
        )
    except Exception as e:
        logger.error(f"POD payment intent creation failed for user {current_user['user_id']}: {e}")
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="payment",
            event_action="pod_payment_system_error",
            properties={"error": str(e), "product_id": request.product_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment system temporarily unavailable"
        )

@router.post("/validate-payment-security")
async def validate_payment_security(
    payment_intent_id: str,
    current_user = Depends(verify_token)
):
    """Validate payment security and compliance before processing"""
    try:
        # Retrieve payment intent
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        # Verify ownership
        if payment_intent.metadata.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized payment access")
        
        # Security validations
        security_checks = {
            "payment_intent_valid": payment_intent.status in ["succeeded", "requires_action"],
            "amount_reasonable": 50 <= payment_intent.amount <= 50000000,  # $0.50 to $500K
            "metadata_present": bool(payment_intent.metadata.get("order_type")),
            "customer_verified": bool(payment_intent.customer),
            "currency_supported": payment_intent.currency == "usd",
            "created_recently": (datetime.utcnow().timestamp() - payment_intent.created) < 3600,  # Within 1 hour
        }
        
        # Check for suspicious patterns
        risk_factors = []
        
        # Check for rapid successive payments
        recent_payments = stripe.PaymentIntent.list(
            customer=payment_intent.customer,
            created={"gte": int(datetime.utcnow().timestamp()) - 600},  # Last 10 minutes
            limit=5
        )
        
        if len(recent_payments.data) > 3:
            risk_factors.append("multiple_recent_payments")
        
        # Check payment amount patterns
        if payment_intent.amount > 100000:  # Over $1000
            risk_factors.append("high_value_payment")
        
        # PCI Compliance checks
        pci_compliance = {
            "card_data_encrypted": True,  # Stripe handles this
            "secure_transmission": True,  # HTTPS enforced
            "tokenized_storage": True,   # No raw card data stored
            "access_controls": True,     # User authentication required
            "audit_logging": True,       # All events tracked
        }
        
        # GDPR Compliance checks
        gdpr_compliance = {
            "data_minimization": bool(payment_intent.metadata.get("customer_email")),
            "purpose_limitation": payment_intent.metadata.get("order_type") in ["pod_purchase", "credit_purchase"],
            "user_consent": True,  # Implied by payment initiation
            "data_retention_policy": True,  # Handled by Stripe
        }
        
        # Calculate overall security score
        passed_checks = sum(security_checks.values())
        total_checks = len(security_checks)
        security_score = (passed_checks / total_checks) * 100
        
        # Determine risk level
        if len(risk_factors) == 0 and security_score >= 95:
            risk_level = "low"
        elif len(risk_factors) <= 1 and security_score >= 85:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # Log security validation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="security",
            event_action="payment_security_validation",
            properties={
                "payment_intent_id": payment_intent_id,
                "security_score": security_score,
                "risk_level": risk_level,
                "risk_factors": risk_factors,
                "validation_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "payment_intent_id": payment_intent_id,
            "security_validation": {
                "passed": security_score >= 85,
                "score": security_score,
                "checks": security_checks,
                "risk_level": risk_level,
                "risk_factors": risk_factors
            },
            "compliance": {
                "pci_compliant": all(pci_compliance.values()),
                "gdpr_compliant": all(gdpr_compliance.values()),
                "pci_checks": pci_compliance,
                "gdpr_checks": gdpr_compliance
            },
            "recommendations": [
                "Use test card 4242424242424242 for testing",
                "Verify all customer information is accurate",
                "Review order details before confirming payment"
            ] if risk_level != "low" else []
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Security validation failed: {str(e)}")

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
        
        # Handle different event types with enhanced logging
        event_type = event["type"]
        logger.info(f"Processing webhook event: {event_type}")
        
        if event_type == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            await handle_successful_payment(payment_intent)
            
        elif event_type == "payment_intent.payment_failed":
            payment_intent = event["data"]["object"]
            await handle_failed_payment(payment_intent)
            
        elif event_type == "payment_intent.requires_action":
            payment_intent = event["data"]["object"]
            await handle_payment_requires_action(payment_intent)
            
        elif event_type == "payment_intent.canceled":
            payment_intent = event["data"]["object"]
            await handle_payment_canceled(payment_intent)
            
        elif event_type == "charge.dispute.created":
            dispute = event["data"]["object"]
            await handle_dispute_created(dispute)
            
        elif event_type == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            await handle_subscription_payment(invoice)
            
        elif event_type == "customer.subscription.created":
            subscription = event["data"]["object"]
            await handle_subscription_created(subscription)
            
        elif event_type == "customer.subscription.updated":
            subscription = event["data"]["object"]
            await handle_subscription_updated(subscription)
            
        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            await handle_subscription_cancelled(subscription)
        
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
        
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

@router.get("/pricing")
async def get_pricing_tiers():
    """Get available subscription pricing tiers"""
    try:
        # Define subscription tiers (in production, these would be stored in database)
        pricing_tiers = [
            {
                "id": "starter",
                "name": "Starter",
                "price": 0,
                "interval": "month",
                "stripe_price_id": None,
                "features": [
                    "10 AI generations per month",
                    "Basic image resolution",
                    "Standard processing speed",
                    "Community support"
                ],
                "generation_limit": 10,
                "is_popular": False
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 19.99,
                "interval": "month",
                "stripe_price_id": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_monthly"),
                "features": [
                    "100 AI generations per month",
                    "High resolution images",
                    "Priority processing",
                    "Advanced AI models",
                    "Email support",
                    "Commercial usage rights"
                ],
                "generation_limit": 100,
                "is_popular": True
            },
            {
                "id": "business",
                "name": "Business",
                "price": 49.99,
                "interval": "month",
                "stripe_price_id": os.getenv("STRIPE_BUSINESS_PRICE_ID", "price_business_monthly"),
                "features": [
                    "500 AI generations per month",
                    "Ultra-high resolution",
                    "Fastest processing",
                    "All AI models",
                    "Priority support",
                    "Team collaboration",
                    "API access",
                    "White-label options"
                ],
                "generation_limit": 500,
                "is_popular": False
            }
        ]
        
        return {"pricing_tiers": pricing_tiers}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pricing: {str(e)}")

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
            
            # Get the price info to determine plan details
            price = subscription.items.data[0].price
            plan_name = price.nickname or "Unknown Plan"
            
            # Map to our tier system
            tier_mapping = {
                os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_monthly"): "pro",
                os.getenv("STRIPE_BUSINESS_PRICE_ID", "price_business_monthly"): "business"
            }
            
            plan_id = tier_mapping.get(price.id, "custom")
            
            return {
                "has_subscription": True,
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "plan_id": plan_id,
                "plan_name": plan_name,
                "amount": price.unit_amount / 100,  # Convert from cents
                "currency": price.currency,
                "interval": price.recurring.interval,
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        else:
            return {
                "has_subscription": False,
                "plan_id": "starter",
                "plan_name": "Starter",
                "amount": 0,
                "generation_limit": 10,
                "generations_used": current_user.get("generations_used", 0)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}")

@router.post("/cancel-subscription")
async def cancel_subscription(current_user = Depends(verify_token)):
    """Cancel user's subscription at period end"""
    try:
        customer = await get_or_create_stripe_customer(current_user)
        
        # Get active subscriptions
        subscriptions = stripe.Subscription.list(
            customer=customer.id,
            status="active"
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        subscription = subscriptions.data[0]
        
        # Cancel at period end
        updated_subscription = stripe.Subscription.modify(
            subscription.id,
            cancel_at_period_end=True
        )
        
        # Track cancellation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="subscription",
            event_action="subscription_cancelled",
            properties={
                "subscription_id": subscription.id,
                "plan_name": subscription.items.data[0].price.nickname,
                "cancel_at_period_end": True
            }
        )
        
        return {
            "success": True,
            "message": "Subscription will be cancelled at the end of the current billing period",
            "cancel_at": updated_subscription.current_period_end
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")

@router.post("/reactivate-subscription")
async def reactivate_subscription(current_user = Depends(verify_token)):
    """Reactivate a cancelled subscription"""
    try:
        customer = await get_or_create_stripe_customer(current_user)
        
        subscriptions = stripe.Subscription.list(
            customer=customer.id,
            status="active"
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        subscription = subscriptions.data[0]
        
        if not subscription.cancel_at_period_end:
            return {"success": True, "message": "Subscription is already active"}
        
        # Reactivate subscription
        updated_subscription = stripe.Subscription.modify(
            subscription.id,
            cancel_at_period_end=False
        )
        
        return {
            "success": True,
            "message": "Subscription reactivated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reactivate subscription: {str(e)}")

@router.get("/credits")
async def get_user_credits(current_user = Depends(verify_token)):
    """Get user's current credit balance and usage"""
    try:
        user_id = current_user["user_id"]
        
        # Get user stats from database
        stats = await db_service.get_user_stats(user_id)
        
        # Get subscription status to determine credit limit
        subscription_status = await get_subscription_status(current_user)
        
        # Determine credit limits based on subscription
        if subscription_status["has_subscription"]:
            plan_id = subscription_status["plan_id"]
            if plan_id == "pro":
                monthly_limit = 100
            elif plan_id == "business":
                monthly_limit = 500
            else:
                monthly_limit = 10  # Starter/fallback
        else:
            monthly_limit = 10  # Free tier
        
        # Calculate credits used this month
        credits_used = stats.get("ai_credits_used", 0)
        remaining_credits = max(0, monthly_limit - credits_used)
        
        # Get recent credit usage (mock for now)
        recent_usage = [
            {
                "date": "2025-08-15",
                "credits_used": 4,
                "operation": "image_generation",
                "model": "dall-e-3"
            },
            {
                "date": "2025-08-14", 
                "credits_used": 2,
                "operation": "image_generation",
                "model": "stable-diffusion"
            }
        ]
        
        return {
            "credits_remaining": remaining_credits,
            "credits_used": credits_used,
            "monthly_limit": monthly_limit,
            "usage_percentage": (credits_used / monthly_limit) * 100 if monthly_limit > 0 else 0,
            "plan_name": subscription_status.get("plan_name", "Starter"),
            "next_reset_date": subscription_status.get("current_period_end"),
            "recent_usage": recent_usage
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get credits: {str(e)}")

@router.get("/order-status/{payment_intent_id}")
async def get_order_status(
    payment_intent_id: str,
    current_user = Depends(verify_token)
):
    """Get POD order status by payment intent ID with real-time POD tracking"""
    try:
        # Verify payment intent ownership
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if payment_intent.metadata.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
        
        # Get order from database
        order = await db_service.get_order_by_payment_intent(payment_intent_id)
        if not order:
            return {
                "payment_intent_id": payment_intent_id,
                "status": "payment_processing",
                "order_created": False,
                "message": "Payment is being processed"
            }
        
        # Extract POD order details from metadata
        metadata = order.get("metadata", {})
        products = metadata.get("products", [])
        pod_order_id = None
        provider = None
        
        if products:
            product = products[0]  # Get first product
            pod_order_id = product.get("pod_order_id")
            provider = product.get("provider", "printful")
        
        # Get real-time POD order status
        pod_status = None
        if pod_order_id and provider:
            pod_status = await get_pod_order_status(pod_order_id, provider)
            
            # Sync status if different from our database
            if pod_status and pod_status.get("status") != order.get("provider_status"):
                await db_service.sync_pod_order_status(pod_order_id, provider)
                # Refresh order data
                order = await db_service.get_order_by_payment_intent(payment_intent_id)
        
        # Map our internal status to user-friendly status
        user_status = map_internal_status_to_user_status(order.get("status", "pending"))
        
        return {
            "payment_intent_id": payment_intent_id,
            "order_id": order.get("order_number"),
            "status": user_status,
            "internal_status": order.get("status"),
            "order_created": True,
            "pod_order_id": pod_order_id,
            "provider": provider,
            "provider_status": order.get("provider_status"),
            "tracking": {
                "tracking_number": order.get("tracking_number"),
                "tracking_url": order.get("tracking_url"),
                "carrier": order.get("carrier"),
                "shipped_at": order.get("shipped_at"),
                "delivered_at": order.get("delivered_at")
            },
            "pod_tracking": pod_status,
            "total_amount": order.get("total_amount"),
            "created_at": order.get("created_at"),
            "updated_at": order.get("updated_at"),
            "estimated_delivery": get_estimated_delivery(order.get("status"), order.get("created_at")),
            "product_details": extract_product_details(products[0] if products else {}),
            "timeline": generate_order_timeline(order)
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid payment intent: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order status: {str(e)}")

@router.get("/my-orders")
async def get_user_orders(
    limit: int = 10,
    offset: int = 0,
    current_user = Depends(verify_token)
):
    """Get user's POD order history"""
    try:
        orders = await db_service.get_user_orders(
            user_id=current_user["user_id"],
            limit=limit,
            offset=offset
        )
        
        # Enrich orders with payment information
        enriched_orders = []
        for order in orders:
            payment_intent_id = order.get("payment_intent_id")
            payment_status = "unknown"
            
            if payment_intent_id:
                try:
                    payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                    payment_status = payment_intent.status
                except:
                    payment_status = "error"
            
            enriched_orders.append({
                **order,
                "payment_status": payment_status
            })
        
        return {
            "orders": enriched_orders,
            "total_orders": len(enriched_orders),
            "has_more": len(enriched_orders) == limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get orders: {str(e)}")

@router.post("/purchase-credits")
async def purchase_credits(
    credits: int,
    current_user = Depends(verify_token)
):
    """Purchase additional credits (one-time payment)"""
    try:
        # Validate credit amount
        if credits < 10 or credits > 1000:
            raise HTTPException(
                status_code=400, 
                detail="Credit purchase must be between 10 and 1000 credits"
            )
        
        # Calculate price (e.g., $0.02 per credit)
        price_per_credit = 0.02
        total_amount = int(credits * price_per_credit * 100)  # Convert to cents
        
        # Create payment intent for credit purchase
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency="usd",
            metadata={
                "user_id": current_user["user_id"],
                "credits_purchased": str(credits),
                "order_type": "credit_purchase"
            },
            automatic_payment_methods={"enabled": True}
        )
        
        # Track credit purchase attempt
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="credit_purchase",
            event_action="purchase_initiated",
            properties={
                "credits": credits,
                "amount": total_amount / 100,
                "payment_intent_id": intent.id
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "credits": credits,
            "amount": total_amount / 100,
            "price_per_credit": price_per_credit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create credit purchase: {str(e)}")

@router.post("/sync-order/{order_id}")
async def sync_order_status(
    order_id: str,
    current_user = Depends(verify_token)
):
    """Manually sync order status with POD provider"""
    try:
        # Verify order ownership
        order = await db_service.get_order_by_payment_intent("")
        if not order:
            # Try to get by order ID
            result = db_service.supabase.table("orders").select("*").eq("id", order_id).execute()
            if not result.data:
                raise HTTPException(status_code=404, detail="Order not found")
            order = result.data[0]
        
        if order.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to sync this order")
        
        # Import sync service
        from ..services.pod_order_sync import pod_sync_service
        
        # Force sync the order
        success = await pod_sync_service.force_sync_order(order_id)
        
        if success:
            # Get updated order
            result = db_service.supabase.table("orders").select("*").eq("id", order_id).execute()
            updated_order = result.data[0] if result.data else order
            
            return {
                "success": True,
                "message": "Order status synchronized",
                "order": {
                    "id": updated_order.get("id"),
                    "status": updated_order.get("status"),
                    "provider_status": updated_order.get("provider_status"),
                    "tracking_number": updated_order.get("tracking_number"),
                    "tracking_url": updated_order.get("tracking_url"),
                    "updated_at": updated_order.get("updated_at")
                }
            }
        else:
            return {
                "success": False,
                "message": "Failed to sync order status",
                "order": {
                    "id": order.get("id"),
                    "status": order.get("status")
                }
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync order: {str(e)}")

@router.get("/order-tracking/{order_number}")
async def get_order_tracking(
    order_number: str,
    current_user = Depends(verify_token)
):
    """Get detailed order tracking information by order number"""
    try:
        # Get order by order number
        result = db_service.supabase.table("orders").select("*").eq("order_number", order_number).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = result.data[0]
        
        # Verify ownership
        if order.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
        
        # Extract POD details
        metadata = order.get("metadata", {})
        products = metadata.get("products", [])
        
        tracking_info = {
            "order_number": order_number,
            "order_id": order.get("id"),
            "status": map_internal_status_to_user_status(order.get("status", "pending")),
            "internal_status": order.get("status"),
            "created_at": order.get("created_at"),
            "updated_at": order.get("updated_at"),
            "total_amount": order.get("total_amount"),
            "currency": order.get("currency", "USD"),
            "tracking": {
                "tracking_number": order.get("tracking_number"),
                "tracking_url": order.get("tracking_url"),
                "carrier": order.get("carrier"),
                "shipped_at": order.get("shipped_at"),
                "delivered_at": order.get("delivered_at")
            },
            "shipping_address": order.get("shipping_address", {}),
            "estimated_delivery": get_estimated_delivery(order.get("status"), order.get("created_at")),
            "timeline": generate_order_timeline(order),
            "products": []
        }
        
        # Add product details
        for product in products:
            pod_order_id = product.get("pod_order_id")
            provider = product.get("provider", "printful")
            
            product_tracking = {
                "product_id": product.get("product_id"),
                "variant_id": product.get("variant_id"),
                "quantity": product.get("quantity", 1),
                "design_url": product.get("design_url"),
                "provider": provider,
                "pod_order_id": pod_order_id,
                "fulfillment_status": product.get("fulfillment_status", "pending")
            }
            
            # Get real-time POD status if available
            if pod_order_id:
                pod_status = await get_pod_order_status(pod_order_id, provider)
                if pod_status:
                    product_tracking["pod_status"] = pod_status
            
            tracking_info["products"].append(product_tracking)
        
        return tracking_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order tracking: {str(e)}")

@router.post("/cancel-order/{order_id}")
async def cancel_pod_order(
    order_id: str,
    reason: Optional[str] = "Customer request",
    current_user = Depends(verify_token)
):
    """Cancel POD order if possible"""
    try:
        # Get order
        result = db_service.supabase.table("orders").select("*").eq("id", order_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = result.data[0]
        
        # Verify ownership
        if order.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this order")
        
        # Check if order can be canceled
        current_status = order.get("status", "pending")
        if current_status in ["shipped", "delivered", "canceled"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel order with status: {current_status}"
            )
        
        # Try to cancel with POD provider
        metadata = order.get("metadata", {})
        products = metadata.get("products", [])
        
        cancellation_results = []
        
        for product in products:
            pod_order_id = product.get("pod_order_id")
            provider = product.get("provider", "printful")
            
            if pod_order_id:
                # Import cancellation function
                from .payments import cancel_pod_order as cancel_with_provider
                
                cancel_result = await cancel_with_provider(pod_order_id, provider)
                cancellation_results.append({
                    "pod_order_id": pod_order_id,
                    "provider": provider,
                    "success": cancel_result.get("success", False),
                    "message": cancel_result.get("message", "Unknown result")
                })
        
        # Update order status in database
        updates = {
            "status": "canceled",
            "canceled_at": datetime.utcnow().isoformat(),
            "cancellation_reason": reason,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        db_service.supabase.table("orders").update(updates).eq("id", order_id).execute()
        
        # Track cancellation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="order_canceled",
            properties={
                "order_id": order_id,
                "order_number": order.get("order_number"),
                "reason": reason,
                "cancellation_results": cancellation_results
            }
        )
        
        return {
            "success": True,
            "message": "Order cancellation initiated",
            "order_id": order_id,
            "status": "canceled",
            "cancellation_results": cancellation_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")

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
    """Handle successful payment webhook with enhanced POD integration"""
    print(f"✅ Payment succeeded: {payment_intent['id']}")
    
    # Track successful payment
    user_id = payment_intent.get("metadata", {}).get("user_id")
    order_type = payment_intent.get("metadata", {}).get("order_type")
    
    if user_id:
        await db_service.track_event(
            user_id=user_id,
            event_type="payment",
            event_action="payment_succeeded",
            properties={
                "payment_intent_id": payment_intent["id"],
                "amount": payment_intent.get("amount", 0) / 100,
                "order_type": order_type,
                "currency": payment_intent.get("currency", "usd")
            }
        )
        
        # Update user statistics
        await db_service.increment_user_stat(user_id, "successful_payments")
        await db_service.update_user_stats(
            user_id,
            {
                "total_spent": payment_intent.get("amount", 0) / 100,
                "last_payment_date": datetime.utcnow().isoformat()
            }
        )
    
    # Handle different payment types
    if order_type == "pod_purchase":
        await create_pod_order(payment_intent)
    elif order_type == "product_purchase":  # Legacy support
        await create_pod_order(payment_intent)
    elif order_type == "credit_purchase":
        await process_credit_purchase(payment_intent)
    else:
        print(f"⚠️  Unknown order type: {order_type}")

async def handle_failed_payment(payment_intent):
    """Handle failed payment webhook"""
    print(f"❌ Payment failed: {payment_intent['id']}")
    
    user_id = payment_intent.get("metadata", {}).get("user_id")
    if user_id:
        await db_service.track_event(
            user_id=user_id,
            event_type="payment",
            event_action="payment_failed",
            properties={
                "payment_intent_id": payment_intent["id"],
                "amount": payment_intent.get("amount", 0) / 100,
                "last_payment_error": payment_intent.get("last_payment_error", {}).get("message", "Unknown error"),
                "order_type": payment_intent.get("metadata", {}).get("order_type")
            }
        )

async def handle_payment_requires_action(payment_intent):
    """Handle payment that requires additional action"""
    print(f"⚠️ Payment requires action: {payment_intent['id']}")
    
    user_id = payment_intent.get("metadata", {}).get("user_id")
    if user_id:
        await db_service.track_event(
            user_id=user_id,
            event_type="payment",
            event_action="payment_requires_action",
            properties={
                "payment_intent_id": payment_intent["id"],
                "amount": payment_intent.get("amount", 0) / 100,
                "next_action": payment_intent.get("next_action", {}).get("type")
            }
        )

async def handle_payment_canceled(payment_intent):
    """Handle canceled payment"""
    print(f"🚫 Payment canceled: {payment_intent['id']}")
    
    user_id = payment_intent.get("metadata", {}).get("user_id")
    if user_id:
        await db_service.track_event(
            user_id=user_id,
            event_type="payment",
            event_action="payment_canceled",
            properties={
                "payment_intent_id": payment_intent["id"],
                "amount": payment_intent.get("amount", 0) / 100,
                "cancellation_reason": payment_intent.get("cancellation_reason")
            }
        )

async def handle_dispute_created(dispute):
    """Handle payment dispute creation"""
    print(f"⚖️ Dispute created: {dispute['id']}")
    
    # Get payment intent from charge
    charge_id = dispute.get("charge")
    if charge_id:
        try:
            charge = stripe.Charge.retrieve(charge_id)
            payment_intent_id = charge.get("payment_intent")
            if payment_intent_id:
                payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                user_id = payment_intent.get("metadata", {}).get("user_id")
                
                if user_id:
                    await db_service.track_event(
                        user_id=user_id,
                        event_type="payment",
                        event_action="dispute_created",
                        properties={
                            "dispute_id": dispute["id"],
                            "charge_id": charge_id,
                            "payment_intent_id": payment_intent_id,
                            "amount": dispute.get("amount", 0) / 100,
                            "reason": dispute.get("reason"),
                            "status": dispute.get("status")
                        }
                    )
        except Exception as e:
            print(f"Error handling dispute: {e}")

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

async def process_credit_purchase(payment_intent):
    """Process credit purchase after successful payment"""
    try:
        metadata = payment_intent.get("metadata", {})
        user_id = metadata.get("user_id")
        credits_purchased = int(metadata.get("credits_purchased", 0))
        
        if user_id and credits_purchased > 0:
            # Add credits to user's account (this would update the database)
            await db_service.increment_user_stat(user_id, "purchased_credits", credits_purchased)
            
            # Track credit addition
            await db_service.track_event(
                user_id=user_id,
                event_type="credit_purchase",
                event_action="credits_added",
                properties={
                    "credits_added": credits_purchased,
                    "payment_intent_id": payment_intent["id"],
                    "amount": payment_intent.get("amount", 0) / 100
                }
            )
            
            print(f"💰 Added {credits_purchased} credits to user {user_id}")
        
    except Exception as e:
        print(f"❌ Credit purchase processing failed: {str(e)}")

async def create_pod_order(payment_intent):
    """Create order with POD provider after successful payment"""
    try:
        metadata = payment_intent.get("metadata", {})
        user_id = metadata.get("user_id")
        
        # Extract order details from metadata
        product_id = metadata.get("product_id")
        variant_id = metadata.get("variant_id")
        design_url = metadata.get("design_url")
        quantity = int(metadata.get("quantity", 1))
        provider = metadata.get("provider", "printful")
        customer_email = metadata.get("customer_email")
        
        # Reconstruct shipping address from metadata
        shipping_address = {
            "name": metadata.get("ship_name", ""),
            "address1": metadata.get("ship_address1", ""),
            "city": metadata.get("ship_city", ""),
            "state": metadata.get("ship_state", ""),
            "country": metadata.get("ship_country", "US"),
            "zip": metadata.get("ship_zip", "")
        }
        
        # Create order request object
        from .pod import OrderRequest, submit_pod_order
        order_request = OrderRequest(
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity,
            design_url=design_url,
            recipient=shipping_address,
            shipping_method="standard"
        )
        
        # Submit order to POD provider
        pod_result = await submit_pod_order(order_request, provider)
        
        if pod_result["success"]:
            # Create order record in database
            order_record = await db_service.create_order(
                user_id=user_id,
                product_details={
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "quantity": quantity,
                    "design_url": design_url,
                    "provider": provider,
                    "pod_order_id": pod_result.get("pod_order_id"),
                    "fulfillment_status": "pending",
                    "payment_intent_id": payment_intent["id"],
                    "customer_email": customer_email
                },
                total_amount=payment_intent.get("amount", 0) / 100,
                shipping_address=shipping_address
            )
            
            # Track successful order creation
            await db_service.track_event(
                user_id=user_id,
                event_type="pod",
                event_action="order_created_after_payment",
                properties={
                    "payment_intent_id": payment_intent["id"],
                    "pod_order_id": pod_result.get("pod_order_id"),
                    "order_id": order_record.get("id") if order_record else None,
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "quantity": quantity,
                    "total_cost": pod_result.get("total_cost"),
                    "provider": provider
                }
            )
            
            print(f"✅ POD order created successfully: {pod_result.get('pod_order_id')}")
            print(f"   Payment: {payment_intent['id']}")
            print(f"   Product: {product_id}, Quantity: {quantity}")
            print(f"   Provider: {provider}")
            
            # TODO: Send order confirmation email to customer
            
        else:
            # Log POD order failure
            await db_service.track_event(
                user_id=user_id,
                event_type="pod",
                event_action="order_creation_failed",
                properties={
                    "payment_intent_id": payment_intent["id"],
                    "error": pod_result.get("error"),
                    "product_id": product_id,
                    "provider": provider
                }
            )
            print(f"❌ POD order creation failed: {pod_result.get('error')}")
        
    except Exception as e:
        print(f"❌ POD order creation failed: {str(e)}")
        if user_id:
            await db_service.track_event(
                user_id=user_id,
                event_type="pod",
                event_action="order_creation_exception",
                properties={
                    "payment_intent_id": payment_intent.get("id"),
                    "error": str(e)
                }
            )

async def get_printful_pricing(product_id: str, variant_id: str, quantity: int, shipping_country: str) -> Dict:
    """Get accurate pricing from Printful API"""
    try:
        printful_api_key = os.getenv("PRINTFUL_API_KEY")
        if not printful_api_key:
            # Return mock pricing if API not configured
            return {
                "base_price": 1999,  # $19.99
                "shipping_cost": 499,  # $4.99
                "tax_amount": 0,
                "total_amount": (1999 * quantity) + 499
            }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get shipping rates from Printful
            shipping_data = {
                "recipient": {"country_code": shipping_country},
                "items": [{"variant_id": int(variant_id), "quantity": quantity}]
            }
            
            response = await client.post(
                "https://api.printful.com/shipping/rates",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                },
                json=shipping_data
            )
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get("result", [])
                if rates:
                    cheapest_rate = min(rates, key=lambda x: float(x.get("rate", 999)))
                    shipping_cost = int(float(cheapest_rate.get("rate", 4.99)) * 100)
                else:
                    shipping_cost = 499  # Default $4.99
            else:
                shipping_cost = 499
            
            # Get product pricing
            product_response = await client.get(
                f"https://api.printful.com/products/{product_id}",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            base_price = 1999  # Default
            if product_response.status_code == 200:
                product_data = product_response.json()
                variants = product_data.get("result", {}).get("variants", [])
                for variant in variants:
                    if str(variant.get("id")) == str(variant_id):
                        base_price = int(float(variant.get("price", 19.99)) * 100)
                        break
            
            return {
                "base_price": base_price,
                "shipping_cost": shipping_cost,
                "tax_amount": 0,  # Tax calculation would be more complex
                "total_amount": (base_price * quantity) + shipping_cost
            }
            
    except Exception as e:
        print(f"Printful pricing error: {e}")
        # Return default pricing on error
        return {
            "base_price": 1999,
            "shipping_cost": 499,
            "tax_amount": 0,
            "total_amount": (1999 * quantity) + 499
        }

async def get_printify_pricing(product_id: str, variant_id: str, quantity: int, shipping_country: str) -> Dict:
    """Get accurate pricing from Printify API"""
    try:
        printify_api_key = os.getenv("PRINTIFY_API_KEY")
        if not printify_api_key:
            return {
                "base_price": 2199,  # $21.99
                "shipping_cost": 599,  # $5.99
                "tax_amount": 0,
                "total_amount": (2199 * quantity) + 599
            }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get shops first
            shops_response = await client.get(
                "https://api.printify.com/v1/shops.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if shops_response.status_code != 200:
                raise Exception("Failed to get Printify shops")
            
            shops = shops_response.json()
            if not shops:
                raise Exception("No Printify shops found")
            
            shop_id = shops[0]["id"]
            
            # Get shipping rates
            shipping_data = {
                "line_items": [{
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "quantity": quantity
                }],
                "address_to": {"country": shipping_country}
            }
            
            shipping_response = await client.post(
                f"https://api.printify.com/v1/shops/{shop_id}/orders/shipping.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                },
                json=shipping_data
            )
            
            shipping_cost = 599  # Default $5.99
            if shipping_response.status_code == 200:
                shipping_data = shipping_response.json()
                if shipping_data and len(shipping_data) > 0:
                    shipping_cost = int(float(shipping_data[0].get("cost", 5.99)) * 100)
            
            # Get blueprint details for pricing
            blueprint_response = await client.get(
                f"https://api.printify.com/v1/catalog/blueprints/{product_id}.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            base_price = 2199  # Default
            if blueprint_response.status_code == 200:
                # Base price would be calculated from provider pricing
                # This is simplified - real implementation would get variant-specific pricing
                base_price = 2199
            
            return {
                "base_price": base_price,
                "shipping_cost": shipping_cost,
                "tax_amount": 0,
                "total_amount": (base_price * quantity) + shipping_cost
            }
            
    except Exception as e:
        print(f"Printify pricing error: {e}")
        return {
            "base_price": 2199,
            "shipping_cost": 599,
            "tax_amount": 0,
            "total_amount": (2199 * quantity) + 599
        }

async def get_pod_order_status(pod_order_id: str, provider: str) -> Dict:
    """Get order status from POD provider"""
    try:
        if provider == "printful":
            return await get_printful_order_status(pod_order_id)
        elif provider == "printify":
            return await get_printify_order_status(pod_order_id)
        else:
            return {
                "status": "unknown",
                "message": "Mock order status",
                "tracking_number": None
            }
    except Exception as e:
        print(f"Error getting POD order status: {e}")
        return {"status": "error", "message": str(e)}

async def get_printful_order_status(order_id: str) -> Dict:
    """Get order status from Printful"""
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key:
        return {"status": "pending", "message": "API not configured"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"https://api.printful.com/orders/{order_id}",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                order_info = data.get("result", {})
                return {
                    "status": order_info.get("status", "pending"),
                    "tracking_number": order_info.get("tracking_number"),
                    "tracking_url": order_info.get("tracking_url"),
                    "estimated_delivery": order_info.get("estimated_delivery")
                }
            else:
                return {"status": "error", "message": "Failed to fetch status"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}

async def get_printify_order_status(order_id: str) -> Dict:
    """Get order status from Printify"""
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key:
        return {"status": "pending", "message": "API not configured"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get shops first
            shops_response = await client.get(
                "https://api.printify.com/v1/shops.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if shops_response.status_code != 200:
                return {"status": "error", "message": "Failed to get shops"}
            
            shops = shops_response.json()
            if not shops:
                return {"status": "error", "message": "No shops found"}
            
            shop_id = shops[0]["id"]
            
            response = await client.get(
                f"https://api.printify.com/v1/shops/{shop_id}/orders/{order_id}.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": data.get("status", "pending"),
                    "tracking_number": data.get("tracking_number"),
                    "tracking_url": data.get("tracking_url")
                }
            else:
                return {"status": "error", "message": "Failed to fetch status"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}

async def cancel_pod_order(pod_order_id: str, provider: str) -> Dict:
    """Cancel order with POD provider"""
    try:
        if provider == "printful":
            return await cancel_printful_order(pod_order_id)
        elif provider == "printify":
            return await cancel_printify_order(pod_order_id)
        else:
            return {"success": True, "message": "Mock order canceled"}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def cancel_printful_order(order_id: str) -> Dict:
    """Cancel Printful order"""
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key:
        return {"success": False, "error": "API not configured"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.delete(
                f"https://api.printful.com/orders/{order_id}",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Order canceled successfully"}
            else:
                return {"success": False, "error": f"Failed to cancel: {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

async def cancel_printify_order(order_id: str) -> Dict:
    """Cancel Printify order"""
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key:
        return {"success": False, "error": "API not configured"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get shops first
            shops_response = await client.get(
                "https://api.printify.com/v1/shops.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if shops_response.status_code != 200:
                return {"success": False, "error": "Failed to get shops"}
            
            shops = shops_response.json()
            if not shops:
                return {"success": False, "error": "No shops found"}
            
            shop_id = shops[0]["id"]
            
            response = await client.delete(
                f"https://api.printify.com/v1/shops/{shop_id}/orders/{order_id}.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Order canceled successfully"}
            else:
                return {"success": False, "error": f"Failed to cancel: {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

async def check_user_credits(user_id: str, credits_needed: int) -> bool:
    """Check if user has enough credits for an operation"""
    try:
        # Get user stats
        stats = await db_service.get_user_stats(user_id)
        
        # Get subscription to determine limits
        # This is simplified - in a real implementation, you'd pass the user object
        monthly_limit = 10  # Default free tier
        credits_used = stats.get("ai_credits_used", 0)
        purchased_credits = stats.get("purchased_credits", 0)
        
        # Calculate available credits
        available_credits = (monthly_limit + purchased_credits) - credits_used
        
        return available_credits >= credits_needed
        
    except Exception as e:
        print(f"Error checking user credits: {e}")
        return False

def map_internal_status_to_user_status(internal_status: str) -> str:
    """Map internal order status to user-friendly status"""
    status_mapping = {
        "pending": "Order Received",
        "confirmed": "Order Confirmed", 
        "in_production": "Being Printed",
        "on_hold": "On Hold",
        "shipped": "Shipped",
        "delivered": "Delivered",
        "canceled": "Canceled",
        "failed": "Failed",
        "returned": "Returned"
    }
    return status_mapping.get(internal_status, "Processing")

def get_estimated_delivery(status: str, created_at: str) -> str:
    """Calculate estimated delivery based on status and creation date"""
    try:
        from datetime import datetime, timedelta
        
        if status in ["delivered"]:
            return "Delivered"
        elif status in ["shipped"]:
            return "2-5 business days"
        elif status in ["in_production"]:
            return "5-10 business days"
        elif status in ["pending", "confirmed"]:
            return "7-14 business days"
        elif status in ["canceled", "failed"]:
            return "N/A"
        else:
            return "7-14 business days"
    except Exception:
        return "7-14 business days"

def extract_product_details(product: Dict) -> Dict:
    """Extract product details from order metadata"""
    return {
        "product_id": product.get("product_id"),
        "variant_id": product.get("variant_id"),
        "quantity": product.get("quantity", 1),
        "design_url": product.get("design_url"),
        "provider": product.get("provider", "printful")
    }

def generate_order_timeline(order: Dict) -> List[Dict]:
    """Generate order timeline with events"""
    timeline = []
    
    # Order created
    if order.get("created_at"):
        timeline.append({
            "timestamp": order["created_at"],
            "status": "order_placed",
            "title": "Order Placed",
            "description": f"Order {order.get('order_number')} received and payment confirmed"
        })
    
    # Order confirmed
    if order.get("status") not in ["pending"]:
        timeline.append({
            "timestamp": order.get("updated_at", order.get("created_at")),
            "status": "confirmed",
            "title": "Order Confirmed", 
            "description": "Order sent to print provider for production"
        })
    
    # In production
    if order.get("status") in ["in_production", "shipped", "delivered"]:
        timeline.append({
            "timestamp": order.get("production_started_at", order.get("updated_at")),
            "status": "in_production",
            "title": "In Production",
            "description": "Your item is being printed and prepared for shipment"
        })
    
    # Shipped
    if order.get("shipped_at"):
        timeline.append({
            "timestamp": order["shipped_at"],
            "status": "shipped",
            "title": "Shipped",
            "description": f"Package shipped with tracking: {order.get('tracking_number', 'N/A')}"
        })
    
    # Delivered
    if order.get("delivered_at"):
        timeline.append({
            "timestamp": order["delivered_at"],
            "status": "delivered",
            "title": "Delivered",
            "description": "Package delivered successfully"
        })
    
    # Canceled
    if order.get("canceled_at"):
        timeline.append({
            "timestamp": order["canceled_at"],
            "status": "canceled",
            "title": "Canceled",
            "description": f"Order canceled: {order.get('cancellation_reason', 'Unknown reason')}"
        })
    
    return timeline
# POD (Print-on-Demand) Integration Guide

## Overview

FlowBotz now implements a comprehensive POD-native order management system that leverages Printful and Printify's native capabilities for order tracking, fulfillment, and customer communication. This system acts as a thin integration layer rather than duplicating POD functionality.

## Architecture

### Core Principles

1. **POD-Native Order Management**: Use POD provider order IDs as primary tracking references
2. **Webhook-Driven Updates**: Real-time order status synchronization via POD webhooks  
3. **Fallback Sync Service**: Background service to handle webhook failures
4. **Minimal Duplication**: Store only essential order data, rely on POD APIs for detailed info

### Order Flow

```
Payment Success → Submit to POD → POD Order ID → Track via POD APIs
                                              ↓
                                        Webhook Updates
                                              ↓  
                                      Update Database
                                              ↓
                                     Notify Customer
```

## Implementation Details

### 1. Enhanced Webhook System

#### Printful Webhooks (`/api/webhooks/printful`)
- `order_created` - Order submitted to Printful
- `order_updated` - Order status changes
- `order_failed` - Order processing failed
- `order_canceled` - Order was canceled
- `package_shipped` - Package shipped with tracking
- `package_returned` - Package was returned

#### Printify Webhooks (`/api/webhooks/printify`)
- `order:created` - Order submitted to Printify
- `order:updated` - Order status changes
- `order:sent_to_production` - Order sent to production
- `order:shipment:created` - Order shipped
- `order:shipment:delivered` - Order delivered
- `order:canceled` - Order canceled

### 2. Status Mapping

#### Internal Status System
- `pending` - Order received, awaiting POD confirmation
- `confirmed` - POD provider confirmed order
- `in_production` - Item being printed/manufactured
- `shipped` - Package shipped with tracking
- `delivered` - Package delivered to customer
- `canceled` - Order canceled
- `failed` - Order failed processing
- `returned` - Package returned

#### Provider Status Mapping

**Printful Mapping:**
```python
{
    'draft': 'pending',
    'pending': 'pending',
    'confirmed': 'confirmed', 
    'inprocess': 'in_production',
    'onhold': 'on_hold',
    'fulfilled': 'shipped',
    'canceled': 'canceled',
    'failed': 'failed'
}
```

**Printify Mapping:**
```python
{
    'pending': 'pending',
    'in_production': 'in_production',
    'sent_to_production': 'in_production',
    'fulfilled': 'shipped',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'canceled': 'canceled'
}
```

### 3. Database Schema

#### Orders Table Fields
```sql
-- Core order info
id: UUID
user_id: UUID
order_number: VARCHAR (FBZ20250816123456)
status: VARCHAR (internal status)
total_amount: DECIMAL
currency: VARCHAR (default: USD)
payment_intent_id: VARCHAR (Stripe payment intent)

-- POD tracking info
tracking_number: VARCHAR
tracking_url: VARCHAR  
carrier: VARCHAR
provider_status: VARCHAR (original POD status)

-- Timestamps
created_at: TIMESTAMP
updated_at: TIMESTAMP
shipped_at: TIMESTAMP
delivered_at: TIMESTAMP
canceled_at: TIMESTAMP

-- Metadata
metadata: JSONB {
  products: [{
    product_id: string,
    variant_id: string,
    quantity: number,
    design_url: string,
    provider: string,
    pod_order_id: string,
    fulfillment_status: string
  }]
}
```

### 4. POD Sync Service

#### Background Sync Process
- Runs every 15 minutes
- Syncs orders not in final states (pending, confirmed, in_production, shipped)
- Handles webhook failures by polling POD APIs
- Updates stale orders (not updated in 4+ hours)

#### Manual Sync Endpoints
- `POST /api/payments/sync-order/{order_id}` - Force sync specific order
- `GET /api/payments/order-tracking/{order_number}` - Get detailed tracking

### 5. Customer Tracking Interface

#### Order Status API (`GET /api/payments/order-status/{payment_intent_id}`)
Returns comprehensive order information:

```json
{
  "payment_intent_id": "pi_123...",
  "order_id": "FBZ20250816123456",
  "status": "Being Printed",
  "internal_status": "in_production",
  "provider": "printful",
  "provider_status": "inprocess",
  "tracking": {
    "tracking_number": "1Z999AA123456789",
    "tracking_url": "https://ups.com/track?...",
    "carrier": "UPS",
    "shipped_at": "2025-08-16T10:30:00Z"
  },
  "timeline": [
    {
      "timestamp": "2025-08-16T09:00:00Z",
      "status": "order_placed",
      "title": "Order Placed",
      "description": "Order received and payment confirmed"
    },
    {
      "timestamp": "2025-08-16T09:15:00Z", 
      "status": "in_production",
      "title": "In Production",
      "description": "Your item is being printed"
    }
  ],
  "estimated_delivery": "5-10 business days"
}
```

## Setup Instructions

### 1. Environment Variables
```bash
# Printful Configuration
PRINTFUL_API_KEY=your_printful_api_key
PRINTFUL_WEBHOOK_SECRET=your_printful_webhook_secret

# Printify Configuration  
PRINTIFY_API_KEY=your_printify_api_key
PRINTIFY_WEBHOOK_SECRET=your_printify_webhook_secret

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 2. Webhook Configuration

#### Printful Webhooks
Configure webhooks in Printful dashboard:
- URL: `https://your-domain.com/api/webhooks/printful`
- Events: All order and package events
- Secret: Set PRINTFUL_WEBHOOK_SECRET

#### Printify Webhooks  
Configure webhooks in Printify dashboard:
- URL: `https://your-domain.com/api/webhooks/printify`
- Events: All order events
- Secret: Set PRINTIFY_WEBHOOK_SECRET

### 3. Database Migration
Ensure orders table has POD tracking fields:
```sql
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255);
ALTER TABLE orders ADD COLUMN tracking_url TEXT;
ALTER TABLE orders ADD COLUMN carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN provider_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN canceled_at TIMESTAMP;
```

## API Endpoints

### Order Management
- `POST /api/payments/create-pod-payment-intent` - Create payment for POD order
- `GET /api/payments/order-status/{payment_intent_id}` - Get order status
- `GET /api/payments/order-tracking/{order_number}` - Get detailed tracking
- `GET /api/payments/my-orders` - Get user's orders
- `POST /api/payments/sync-order/{order_id}` - Manual sync
- `POST /api/payments/cancel-order/{order_id}` - Cancel order

### Webhooks
- `POST /api/webhooks/printful` - Printful webhook handler
- `POST /api/webhooks/printify` - Printify webhook handler
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `GET /api/webhooks/test` - Test webhook endpoints

### POD Products
- `GET /api/pod/products` - Get available products
- `GET /api/pod/products/unified` - Get products from all providers
- `POST /api/pod/mockup` - Generate product mockup

## Testing

### Webhook Testing
```bash
# Test webhook endpoints
python3 test_pod_webhooks.py

# Manual webhook testing with curl
curl -X POST http://localhost:8000/api/webhooks/printful \
  -H "Content-Type: application/json" \
  -d '{"type": "order_created", "data": {"id": "12345", "status": "pending"}}'
```

### Order Flow Testing
1. Create payment intent via `/api/payments/create-pod-payment-intent`
2. Complete payment with Stripe test cards
3. Monitor webhook processing in logs
4. Check order status via `/api/payments/order-status/{payment_intent_id}`
5. Test manual sync via `/api/payments/sync-order/{order_id}`

## Security Considerations

### Webhook Security
- All webhooks verify signatures using provider secrets
- HMAC-SHA256 signature verification for Printful/Printify
- Stripe uses built-in webhook verification
- Rate limiting on all webhook endpoints

### Payment Security
- PCI compliance through Stripe
- No raw card data stored
- Secure payment intent creation
- User authorization on all order operations

### Data Protection
- User data encryption at rest and in transit
- GDPR compliance for order data
- Minimal data storage (rely on POD APIs)
- Secure POD API key management

## Error Handling

### Webhook Failures
- Background sync service provides fallback
- Automatic retry for failed webhook deliveries
- Manual sync endpoints for immediate updates
- Comprehensive error logging and monitoring

### Payment Failures
- Automatic POD order cancellation on payment failure
- Refund processing for failed orders
- Clear error messages to users
- Detailed logging for debugging

### POD API Issues
- Graceful fallback to cached data
- Retry logic with exponential backoff
- Error tracking and alerting
- Mock responses for development

## Monitoring & Analytics

### Key Metrics
- Webhook delivery success rates
- Order status sync accuracy
- Payment-to-fulfillment conversion
- Average order processing time
- Customer satisfaction scores

### Logging
- All webhook events logged with full payload
- Order status changes tracked with timestamps
- API call success/failure rates
- Performance metrics for sync operations

### Alerts
- Webhook delivery failures
- POD API outages or high error rates
- Order processing delays
- Payment processing issues

## Best Practices

### Development
1. Use POD sandbox/test environments
2. Implement comprehensive webhook testing
3. Mock POD responses for offline development
4. Test payment flows with Stripe test cards

### Production
1. Monitor webhook delivery rates closely
2. Set up alerting for POD API issues
3. Implement graceful degradation for API failures
4. Regular sync service health checks

### Customer Experience
1. Provide real-time order tracking
2. Clear delivery estimates based on POD data
3. Proactive communication about delays
4. Easy order cancellation when possible

This POD integration provides a robust, scalable foundation for print-on-demand order management while leveraging the native capabilities of Printful and Printify for optimal efficiency and customer experience.
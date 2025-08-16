'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CreditCard, Lock, CheckCircle, XCircle } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFlowProps {
  productId: string;
  variantId: string;
  quantity: number;
  designUrl: string;
  shippingAddress: {
    name: string;
    address1: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  customerEmail: string;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

interface PricingBreakdown {
  product_cost: number;
  shipping: number;
  platform_fee: number;
  tax: number;
  total: number;
}

interface PaymentDetails {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  pricing_breakdown: PricingBreakdown;
  provider: string;
  estimated_delivery: string;
}

const PaymentForm: React.FC<PaymentFlowProps> = ({
  productId,
  variantId,
  quantity,
  designUrl,
  shippingAddress,
  customerEmail,
  onPaymentSuccess,
  onPaymentError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'pricing' | 'payment' | 'processing' | 'success' | 'error'>('pricing');

  // Fetch pricing and create payment intent
  useEffect(() => {
    const initializePayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get authentication token
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Create payment intent
        const response = await fetch('/api/payments/create-pod-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            product_id: productId,
            variant_id: variantId,
            quantity,
            design_url: designUrl,
            shipping_address: shippingAddress,
            customer_email: customerEmail
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create payment intent');
        }

        const data = await response.json();
        setPaymentDetails(data);
        setStep('payment');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setStep('error');
        onPaymentError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [productId, variantId, quantity, designUrl, shippingAddress, customerEmail, onPaymentError]);

  const handlePayment = async () => {
    if (!stripe || !elements || !paymentDetails) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep('processing');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      setStep('error');
      return;
    }

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentDetails.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: shippingAddress.name,
              email: customerEmail,
              address: {
                line1: shippingAddress.address1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                country: shippingAddress.country,
                postal_code: shippingAddress.zip
              }
            }
          }
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        setStep('success');
        onPaymentSuccess({
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status,
          provider: paymentDetails.provider
        });
      } else {
        throw new Error('Payment not completed successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      setStep('error');
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  if (step === 'pricing' || isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Calculating Pricing...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Payment Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              className="flex-1"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Your order has been placed and will be processed within 24 hours.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium">Estimated Delivery</p>
              <p className="text-green-700">{paymentDetails?.estimated_delivery}</p>
            </div>
            <Button onClick={onCancel} className="w-full">
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing Payment...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-blue-200 rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Please don't close this window</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Order Summary */}
          {paymentDetails && (
            <div className="space-y-3">
              <h3 className="font-medium">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Product ({quantity}x)</span>
                  <span>${(paymentDetails.pricing_breakdown.product_cost / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>${(paymentDetails.pricing_breakdown.shipping / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>${(paymentDetails.pricing_breakdown.platform_fee / 100).toFixed(2)}</span>
                </div>
                {paymentDetails.pricing_breakdown.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${(paymentDetails.pricing_breakdown.tax / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>${(paymentDetails.pricing_breakdown.total / 100).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Provider: {paymentDetails.provider} • {paymentDetails.estimated_delivery}
              </div>
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Card Information
              </label>
              <div className="border rounded-md p-3 bg-white">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Lock className="h-3 w-3" />
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment}
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${paymentDetails ? (paymentDetails.amount / 100).toFixed(2) : '0.00'}`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component wrapper with Stripe Elements provider
export const PaymentFlow: React.FC<PaymentFlowProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default PaymentFlow;
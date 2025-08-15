"use client"

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  productDetails?: {
    id: string
    name: string
    variant: string
    quantity: number
    designUrl: string
  }
  onSuccess?: (paymentIntent: any) => void
  onError?: (error: string) => void
}

interface CheckoutFormProps {
  amount: number
  productDetails?: PaymentModalProps['productDetails']
  onSuccess?: (paymentIntent: any) => void
  onError?: (error: string) => void
  onClose: () => void
}

function CheckoutForm({ amount, productDetails, onSuccess, onError, onClose }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentError, setPaymentError] = useState<string>('')

  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentIntent()
  }, [amount])

  const createPaymentIntent = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      
      let endpoint = '/api/payments/create-payment-intent'
      let body: any = {
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata: {}
      }

      // If this is a product purchase, use the product endpoint
      if (productDetails) {
        endpoint = '/api/payments/purchase-product'
        body = {
          product_id: productDetails.id,
          variant_id: productDetails.variant,
          quantity: productDetails.quantity,
          design_url: productDetails.designUrl,
          shipping_address: {
            // These would come from a shipping form
            name: "Customer Name",
            address_line1: "123 Main St",
            city: "Anytown",
            state: "CA",
            postal_code: "12345",
            country: "US"
          },
          customer_email: "customer@example.com"
        }
      }

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const data = await response.json()
      setClientSecret(data.client_secret)
    } catch (error) {
      console.error('Payment intent creation failed:', error)
      setPaymentError('Failed to initialize payment. Please try again.')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setIsProcessing(true)
    setPaymentError('')

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setPaymentError('Card element not found')
      setIsProcessing(false)
      return
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer Name', // This would come from a form
          },
        },
      })

      if (error) {
        setPaymentError(error.message || 'Payment failed')
        onError?.(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess?.(paymentIntent)
        onClose()
      }
    } catch (error) {
      setPaymentError('An unexpected error occurred')
      onError?.('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'transparent',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="cosmic-card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
        {productDetails ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{productDetails.name}</span>
              <span className="text-white">${(amount - 4.99).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Shipping</span>
              <span className="text-white">$4.99</span>
            </div>
            <div className="border-t border-white/20 pt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-white">Total</span>
                <span className="text-green-400">${amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between font-semibold">
            <span className="text-white">Total</span>
            <span className="text-green-400">${amount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Payment Form */}
      <div className="cosmic-card p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
        
        <div className="space-y-4">
          {/* Card Element */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Card Information
            </label>
            <div className="cosmic-input p-3">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>🔒</span>
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Error Display */}
          {paymentError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{paymentError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="cosmic-button cosmic-button-ghost flex-1"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className="cosmic-button cosmic-button-primary flex-1 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </span>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  )
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  productDetails,
  onSuccess,
  onError
}: PaymentModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4">
        <div className="cosmic-card-hero p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold cosmic-text-gradient">
              Complete Payment
            </h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stripe Elements Provider */}
          <Elements stripe={stripePromise}>
            <CheckoutForm
              amount={amount}
              productDetails={productDetails}
              onSuccess={onSuccess}
              onError={onError}
              onClose={onClose}
            />
          </Elements>
        </div>
      </div>
    </div>
  )
}
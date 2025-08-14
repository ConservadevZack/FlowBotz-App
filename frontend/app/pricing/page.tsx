"use client"

import { useState } from 'react'
import Link from 'next/link'
import FloatingNavbar from '@/components/FloatingNavbar'

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  billingPeriod: 'month' | 'year'
  features: string[]
  highlights: string[]
  cta: string
  popular?: boolean
  enterprise?: boolean
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const monthlyPlans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for trying out AI design creation',
      price: 0,
      billingPeriod: 'month',
      features: [
        '5 AI image generations per month',
        'Basic design templates',
        'Standard resolution (1024x1024)',
        'Community support',
        'Watermarked downloads'
      ],
      highlights: ['Great for beginners'],
      cta: 'Get Started Free'
    },
    {
      id: 'creator',
      name: 'Creator',
      description: 'For serious designers and content creators',
      price: 19.99,
      billingPeriod: 'month',
      features: [
        '100 AI image generations per month',
        'All design templates',
        'HD resolution (up to 2048x2048)',
        'Premium models (FLUX, SD 3.5)',
        'No watermarks',
        'Print-ready files',
        'Priority support',
        'Commercial usage rights'
      ],
      highlights: ['Most popular', 'Best value'],
      cta: 'Start Creating',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For professionals and growing businesses',
      price: 49.99,
      billingPeriod: 'month',
      features: [
        '500 AI image generations per month',
        'All premium features',
        'Ultra HD resolution (up to 4096x4096)',
        'Advanced AI models',
        'Batch generation',
        'API access',
        'Custom templates',
        'Priority processing',
        'Advanced analytics',
        'Team collaboration (up to 5 users)'
      ],
      highlights: ['Professional grade', 'Team features'],
      cta: 'Go Pro'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      price: 0, // Custom pricing
      billingPeriod: 'month',
      features: [
        'Unlimited AI generations',
        'Custom AI model training',
        'White-label solution',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantees',
        'Advanced security features',
        'Unlimited team members',
        'Custom billing'
      ],
      highlights: ['Custom pricing', 'Dedicated support'],
      cta: 'Contact Sales',
      enterprise: true
    }
  ]

  const yearlyPlans: PricingPlan[] = monthlyPlans.map(plan => ({
    ...plan,
    billingPeriod: 'year' as const,
    price: plan.enterprise ? 0 : Math.round(plan.price * 12 * 0.8), // 20% discount
    originalPrice: plan.enterprise ? undefined : plan.price * 12
  }))

  const currentPlans = billingCycle === 'monthly' ? monthlyPlans : yearlyPlans

  const handleSubscribe = async (planId: string) => {
    if (planId === 'starter') {
      // Free plan - just redirect to signup
      window.location.href = '/signup'
      return
    }

    if (planId === 'enterprise') {
      // Enterprise - redirect to contact
      window.location.href = '/contact'
      return
    }

    setIsLoading(planId)
    try {
      // TODO: Integrate with Stripe Checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle
        })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      // For demo, just redirect to signup
      window.location.href = '/signup'
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <FloatingNavbar />

      {/* Moving background */}
      <div className="cosmic-moving-background">
        <div className="cosmic-orb cosmic-orb-1"></div>
        <div className="cosmic-orb cosmic-orb-2"></div>
        <div className="cosmic-orb cosmic-orb-3"></div>
        <div className="cosmic-orb cosmic-orb-4"></div>
        <div className="cosmic-orb cosmic-orb-5"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display-large cosmic-text-gradient mb-4">
            Choose Your Plan
          </h1>
          <p className="text-body-large text-white/80 max-w-2xl mx-auto mb-8">
            Start creating stunning AI-powered designs today. Upgrade anytime as your needs grow.
          </p>

          {/* Billing Toggle */}
          <div className="cosmic-card inline-flex p-1 max-w-xs mx-auto">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-purple-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-purple-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-1 bg-green-500 text-xs px-1 py-0.5 rounded text-white font-medium">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {currentPlans.map((plan) => (
            <div
              key={plan.id}
              className={`cosmic-card relative ${
                plan.popular ? 'stellar-glass-purple' : ''
              } ${plan.enterprise ? 'stellar-glass-gold' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <span>⭐</span>
                    Most Popular
                  </div>
                </div>
              )}

              {/* Enterprise Badge */}
              {plan.enterprise && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <span>🚀</span>
                    Enterprise
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-h4 font-bold mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  {plan.enterprise ? (
                    <div className="text-h3 font-bold">Custom</div>
                  ) : (
                    <div>
                      <div className="text-h3 font-bold">
                        ${plan.price}
                        {plan.originalPrice && (
                          <span className="text-lg text-white/50 line-through ml-2">
                            ${plan.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="text-white/60 text-sm">
                        per {plan.billingPeriod}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlights */}
                {plan.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {plan.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span className="text-sm text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading === plan.id}
                className={`w-full cosmic-button ${
                  plan.popular
                    ? 'cosmic-button-primary'
                    : plan.enterprise
                    ? 'cosmic-button-accent'
                    : 'cosmic-button-glass'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === plan.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {plan.id === 'starter' && <span className="mr-2">✨</span>}
                    {plan.popular && <span className="mr-2">⭐</span>}
                    {plan.enterprise && <span className="mr-2">🚀</span>}
                    {plan.cta}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="cosmic-card max-w-4xl mx-auto">
          <h2 className="text-h3 font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-white/70 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Do unused generations roll over?</h3>
              <p className="text-white/70 text-sm">
                Unused generations expire at the end of each billing cycle. We recommend choosing a plan that fits your monthly usage.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-white/70 text-sm">
                We accept all major credit cards, PayPal, and bank transfers for enterprise plans.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-white/70 text-sm">
                Our Starter plan is completely free with 5 generations per month. No credit card required.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Can I use generated images commercially?</h3>
              <p className="text-white/70 text-sm">
                Yes! Creator plan and above include full commercial usage rights for all generated content.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-white text-base">Do you offer refunds?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                We offer a 30-day money-back guarantee on all paid plans. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-12">
          <p className="text-white/60 text-sm mb-4">Trusted by creators worldwide</p>
          <div className="flex items-center justify-center gap-8 text-white/40">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>4.9/5 Rating</span>
            </div>
            <div>•</div>
            <div>50,000+ Designs Created</div>
            <div>•</div>
            <div>99.9% Uptime</div>
          </div>
        </div>
      </div>
    </div>
  )
}
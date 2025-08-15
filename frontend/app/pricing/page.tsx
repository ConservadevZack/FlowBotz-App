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
        <div className="text-center mb-16 cosmic-animate-fade-in">
          <h1 className="text-display-large cosmic-text-gradient mb-6 font-bold">
            Choose Your Plan
          </h1>
          <p className="text-body-large text-white/85 max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
            Start creating stunning AI-powered designs today. Upgrade anytime as your needs grow. Join thousands of creators worldwide.
          </p>

          {/* Billing Toggle */}
          <div className="cosmic-card-premium inline-flex p-2 max-w-sm mx-auto cosmic-animate-bounce-in cosmic-interactive border border-white/20">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 px-6 py-3 rounded-xl transition-all duration-300 font-semibold text-base ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 px-6 py-3 rounded-xl transition-all duration-300 relative font-semibold text-base ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-xs px-2 py-1 rounded-full text-white font-bold shadow-lg animate-pulse">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 cosmic-stagger">
          {currentPlans.map((plan) => (
            <article
              key={plan.id}
              className={`cosmic-card-premium relative cosmic-animate-scale-in cosmic-interactive cosmic-focus-ring p-8 border-2 transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'stellar-glass-purple border-purple-400/50 shadow-2xl shadow-purple-500/20' : 'border-white/20'
              } ${plan.enterprise ? 'stellar-glass-gold border-yellow-400/50 shadow-2xl shadow-yellow-500/20' : ''}`}
              tabIndex="0"
              role="article"
              aria-labelledby={`plan-${plan.id}-name`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-base font-bold flex items-center gap-2 shadow-2xl animate-pulse">
                    <span className="text-xl">⭐</span>
                    Most Popular
                  </div>
                </div>
              )}

              {/* Enterprise Badge */}
              {plan.enterprise && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-full text-base font-bold flex items-center gap-2 shadow-2xl">
                    <span className="text-xl">🚀</span>
                    Enterprise
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 id={`plan-${plan.id}-name`} className="text-h2 font-bold mb-4">{plan.name}</h3>
                <p className="text-white/75 text-base mb-6 font-medium leading-relaxed">{plan.description}</p>
                
                <div className="mb-6">
                  {plan.enterprise ? (
                    <div className="text-h1 font-extrabold cosmic-text-gradient">Custom</div>
                  ) : (
                    <div>
                      <div className="text-h1 font-extrabold tracking-tight">
                        <span className="cosmic-text-gradient">${plan.price}</span>
                        {plan.originalPrice && (
                          <span className="text-xl text-white/50 line-through ml-3">
                            ${plan.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="text-white/70 text-base font-semibold mt-2">
                        per {plan.billingPeriod}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlights */}
                {plan.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {plan.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-4 py-2 bg-purple-500/25 text-purple-200 text-sm rounded-xl font-semibold border border-purple-400/30"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-4">
                    <span className="text-green-400 flex-shrink-0 mt-1 text-lg font-bold">✓</span>
                    <span className="text-base text-white/85 font-medium leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading === plan.id}
                className={`w-full cosmic-focus-ring font-bold text-lg min-h-[56px] transition-all duration-300 hover:scale-105 shadow-xl ${
                  plan.popular
                    ? 'cosmic-button-premium cosmic-button-xl'
                    : plan.enterprise
                    ? 'cosmic-button cosmic-button-accent cosmic-button-xl'
                    : 'cosmic-button cosmic-button-glass cosmic-button-lg border-2 border-white/30 hover:border-white/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === plan.id ? (
                  <>
                    <div className="cosmic-spinner mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {plan.id === 'starter' && <span className="mr-3 text-xl">✨</span>}
                    {plan.popular && <span className="mr-3 text-xl">⭐</span>}
                    {plan.enterprise && <span className="mr-3 text-xl">🚀</span>}
                    {plan.cta}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <section className="cosmic-card-premium max-w-5xl mx-auto cosmic-animate-slide-in-left p-10 border border-white/20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-h2 font-bold text-center mb-12 cosmic-text-gradient">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold mb-3 text-lg">Can I change plans anytime?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold mb-3 text-lg">Do unused generations roll over?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                Unused generations expire at the end of each billing cycle. We recommend choosing a plan that fits your monthly usage.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold mb-3 text-lg">What payment methods do you accept?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                We accept all major credit cards, PayPal, and bank transfers for enterprise plans. Secure payment processing via Stripe.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold mb-3 text-lg">Is there a free trial?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                Our Starter plan is completely free with 5 generations per month. No credit card required to get started.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold mb-3 text-lg">Can I use generated images commercially?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                Yes! Creator plan and above include full commercial usage rights for all generated content.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-white text-lg mb-3">Do you offer refunds?</h3>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                We offer a 30-day money-back guarantee on all paid plans. Contact support for immediate assistance.
              </p>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <div className="text-center mt-16">
          <p className="text-white/75 text-lg mb-6 font-semibold">Trusted by creators worldwide</p>
          <div className="cosmic-card-premium p-8 max-w-4xl mx-auto border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white/80">
              <div className="flex flex-col items-center gap-3">
                <span className="text-yellow-400 text-3xl">⭐</span>
                <span className="text-2xl font-bold cosmic-text-gradient">4.9/5</span>
                <span className="font-semibold">Rating</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-purple-400 text-3xl">🎨</span>
                <span className="text-2xl font-bold cosmic-text-gradient">50,000+</span>
                <span className="font-semibold">Designs Created</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-green-400 text-3xl">✅</span>
                <span className="text-2xl font-bold cosmic-text-gradient">99.9%</span>
                <span className="font-semibold">Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
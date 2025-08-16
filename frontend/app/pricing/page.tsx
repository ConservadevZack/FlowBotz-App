'use client'

import { useState } from 'react'
import Navigation from '../components/Navigation'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const plans = [
    {
      name: 'Starter',
      price: billingCycle === 'monthly' ? 9 : 90,
      credits: 100,
      features: [
        '100 AI generations per month',
        'Basic style presets',
        'Standard resolution (1024px)',
        'Community gallery access',
        'Email support'
      ],
      color: '#06B6D4',
      popular: false
    },
    {
      name: 'Pro',
      price: billingCycle === 'monthly' ? 29 : 290,
      credits: 500,
      features: [
        '500 AI generations per month',
        'All style presets + custom creation',
        'High resolution (2048px)',
        'Batch generation (up to 10)',
        'Priority support',
        'Commercial license'
      ],
      color: '#8B5CF6',
      popular: true
    },
    {
      name: 'Enterprise',
      price: billingCycle === 'monthly' ? 99 : 990,
      credits: 2000,
      features: [
        '2000 AI generations per month',
        'Advanced AI models',
        'Ultra-high resolution (4096px)',
        'Unlimited batch generation',
        'White-label options',
        'Dedicated account manager',
        'API access'
      ],
      color: '#EC4899',
      popular: false
    }
  ]

  return (
    <div style={{ 
      minHeight: '100vh', 
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Navigation />

      {/* Main Content */}
      <main style={{ paddingTop: '80px', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '16px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Simple, Transparent Pricing
            </h1>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Choose the perfect plan for your creative needs. Upgrade or downgrade at any time.
            </p>
          </div>

          {/* Billing Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '48px',
            gap: '16px'
          }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              style={{
                width: '48px',
                height: '24px',
                backgroundColor: billingCycle === 'yearly' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '12px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: billingCycle === 'yearly' ? '26px' : '2px',
                transition: 'left 0.2s'
              }} />
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Yearly
              <span style={{
                marginLeft: '8px',
                padding: '2px 6px',
                backgroundColor: '#10B981',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                Save 20%
              </span>
            </span>
          </div>

          {/* Pricing Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            marginBottom: '64px'
          }}>
            {plans.map((plan, index) => (
              <div key={plan.name} style={{
                background: plan.popular 
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: plan.popular 
                  ? '2px solid rgba(139, 92, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '32px',
                position: 'relative',
                textAlign: 'center'
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                    color: '#fff',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    Most Popular
                  </div>
                )}

                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: plan.color,
                  marginBottom: '8px'
                }}>
                  {plan.name}
                </h3>

                <div style={{ marginBottom: '24px' }}>
                  <span style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>

                <div style={{
                  backgroundColor: `${plan.color}20`,
                  border: `1px solid ${plan.color}40`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '24px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: plan.color
                  }}>
                    💎 {plan.credits} credits included
                  </span>
                </div>

                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 32px 0',
                  textAlign: 'left'
                }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      <span style={{ color: '#10B981' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: plan.popular 
                    ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: plan.popular 
                    ? 'none'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  {plan.popular ? 'Get Started' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
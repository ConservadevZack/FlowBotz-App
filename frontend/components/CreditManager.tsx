"use client"

import { useState, useEffect } from 'react'
import { apiService } from '@/lib/api'
import PaymentModal from './PaymentModal'

interface CreditData {
  credits_remaining: number
  credits_used: number
  monthly_limit: number
  usage_percentage: number
  plan_name: string
  next_reset_date?: number
  recent_usage: Array<{
    date: string
    credits_used: number
    operation: string
    model: string
  }>
}

interface CreditManagerProps {
  onCreditUpdate?: (credits: number) => void
}

export default function CreditManager({ onCreditUpdate }: CreditManagerProps) {
  const [creditData, setCreditData] = useState<CreditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedCreditPack, setSelectedCreditPack] = useState<{credits: number, price: number} | null>(null)

  const creditPacks = [
    { credits: 50, price: 1.00, popular: false },
    { credits: 100, price: 1.90, popular: true },
    { credits: 250, price: 4.50, popular: false },
    { credits: 500, price: 8.50, popular: false }
  ]

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      setLoading(true)
      const data = await apiService.payments.getCredits()
      setCreditData(data)
      onCreditUpdate?.(data.credits_remaining)
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseCredits = async (credits: number) => {
    try {
      const purchaseData = await apiService.payments.purchaseCredits(credits)
      
      setSelectedCreditPack({
        credits,
        price: purchaseData.amount
      })
      setShowPurchaseModal(true)
    } catch (error) {
      console.error('Failed to initiate credit purchase:', error)
    }
  }

  const handlePaymentSuccess = () => {
    setShowPurchaseModal(false)
    setSelectedCreditPack(null)
    // Refresh credit data
    fetchCredits()
  }

  if (loading) {
    return (
      <div className="cosmic-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-white/20 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-white/20 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!creditData) {
    return (
      <div className="cosmic-card p-6">
        <p className="text-white/70">Unable to load credit information</p>
      </div>
    )
  }

  const resetDate = creditData.next_reset_date 
    ? new Date(creditData.next_reset_date * 1000).toLocaleDateString()
    : 'Next month'

  return (
    <>
      <div className="cosmic-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">AI Credits</h3>
          <span className="text-sm text-white/60">{creditData.plan_name} Plan</span>
        </div>

        {/* Credit Balance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-green-400">
              {creditData.credits_remaining}
            </span>
            <span className="text-sm text-white/60">
              {creditData.credits_used} / {creditData.monthly_limit} used
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(creditData.usage_percentage, 100)}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-white/60">
            Resets on {resetDate}
          </p>
        </div>

        {/* Low Credits Warning */}
        {creditData.credits_remaining < 5 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ Low on credits! Purchase more to continue generating AI content.
            </p>
          </div>
        )}

        {/* Credit Packs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/80 mb-3">Purchase Additional Credits</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {creditPacks.map((pack) => (
              <button
                key={pack.credits}
                onClick={() => handlePurchaseCredits(pack.credits)}
                className={`cosmic-card p-3 hover:scale-[1.02] transition-all duration-200 relative ${
                  pack.popular ? 'ring-2 ring-green-400/50' : ''
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-400 text-black text-xs px-2 py-1 rounded-full font-medium">
                      Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {pack.credits}
                  </div>
                  <div className="text-xs text-white/60 mb-1">credits</div>
                  <div className="text-sm font-semibold text-green-400">
                    ${pack.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/50">
                    ${(pack.price / pack.credits).toFixed(3)}/credit
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Usage */}
        {creditData.recent_usage.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/80 mb-3">Recent Usage</h4>
            <div className="space-y-2">
              {creditData.recent_usage.slice(0, 3).map((usage, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {usage.operation} ({usage.model})
                  </span>
                  <span className="text-red-400">-{usage.credits_used}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPurchaseModal && selectedCreditPack && (
        <PaymentModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          amount={selectedCreditPack.price}
          type="product"
          productDetails={{
            id: 'credits',
            name: `${selectedCreditPack.credits} AI Credits`,
            variant: 'digital',
            quantity: 1,
            designUrl: ''
          }}
          onSuccess={handlePaymentSuccess}
          onError={(error) => console.error('Payment failed:', error)}
        />
      )}
    </>
  )
}
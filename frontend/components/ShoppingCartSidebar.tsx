"use client"

import { useState } from 'react'
import { useCart } from '@/hooks/useShoppingCart'
import PaymentModal from './PaymentModal'

interface ShoppingCartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShoppingCartSidebar({ isOpen, onClose }: ShoppingCartSidebarProps) {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [processingCheckout, setProcessingCheckout] = useState(false)

  const handleCheckout = () => {
    if (items.length === 0) return
    setShowCheckout(true)
  }

  const handlePaymentSuccess = () => {
    clearCart()
    setShowCheckout(false)
    onClose()
    // Show success message
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const getItemImage = (item: any) => {
    return item.imageUrl || '/api/placeholder/80/80'
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">
              Shopping Cart ({totalItems})
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

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-white/60 mt-12">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 9M7 13l-1.5-9M7 13h10M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                </svg>
                <p className="text-lg mb-2">Your cart is empty</p>
                <p className="text-sm">Add some designs to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="cosmic-card p-4">
                    <div className="flex items-start gap-3">
                      {/* Item Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <img 
                          src={getItemImage(item)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm truncate">
                          {item.name}
                        </h3>
                        <p className="text-white/60 text-xs mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        
                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-green-400 font-semibold text-sm">
                            {formatPrice(item.price)}
                          </span>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors"
                            >
                              -
                            </button>
                            <span className="text-white text-sm w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-white/10 space-y-4">
              {/* Clear Cart */}
              <button
                onClick={clearCart}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Clear Cart
              </button>
              
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-green-400 font-bold text-lg">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              
              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={processingCheckout}
                className="cosmic-button cosmic-button-primary w-full disabled:opacity-50"
              >
                {processingCheckout ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  `Checkout - ${formatPrice(totalPrice)}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <PaymentModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          amount={totalPrice}
          type="product"
          productDetails={{
            id: 'cart-checkout',
            name: `${totalItems} item${totalItems > 1 ? 's' : ''}`,
            variant: 'mixed',
            quantity: totalItems,
            designUrl: items[0]?.imageUrl || ''
          }}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('Checkout failed:', error)
            setProcessingCheckout(false)
          }}
        />
      )}
    </>
  )
}
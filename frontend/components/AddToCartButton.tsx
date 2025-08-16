"use client"

import { useState } from 'react'
import { useShoppingCart } from './CartProvider'
import type { CartItem } from '@/hooks/useShoppingCart'

interface AddToCartButtonProps {
  item: Omit<CartItem, 'id'>
  className?: string
  variant?: 'primary' | 'secondary' | 'icon'
  disabled?: boolean
  showQuantity?: boolean
}

export default function AddToCartButton({ 
  item, 
  className = '', 
  variant = 'primary',
  disabled = false,
  showQuantity = false
}: AddToCartButtonProps) {
  const { addItem, isInCart, items, updateQuantity } = useShoppingCart()
  const [isAdding, setIsAdding] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const itemInCart = isInCart(item.metadata)
  const cartItem = items.find(cartItem => 
    cartItem.metadata.designId === item.metadata.designId &&
    cartItem.metadata.productId === item.metadata.productId &&
    cartItem.metadata.variantId === item.metadata.variantId
  )

  const handleAddToCart = async () => {
    if (disabled || isAdding) return

    setIsAdding(true)
    
    try {
      addItem(item)
      setShowSuccess(true)
      
      // Reset success state after animation
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to add item to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleQuantityChange = (change: number) => {
    if (!cartItem) return
    
    const newQuantity = cartItem.quantity + change
    updateQuantity(cartItem.id, newQuantity)
  }

  // Icon variant - just the cart icon
  if (variant === 'icon') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
        className={`cosmic-button cosmic-button-secondary p-2 disabled:opacity-50 ${className}`}
        title={itemInCart ? 'Added to cart' : 'Add to cart'}
      >
        {showSuccess ? (
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 9M7 13l-1.5-9M7 13h10M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
          </svg>
        )}
      </button>
    )
  }

  // Show quantity controls if item is in cart and showQuantity is true
  if (itemInCart && showQuantity && cartItem) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => handleQuantityChange(-1)}
          className="cosmic-button cosmic-button-secondary w-8 h-8 p-0 flex items-center justify-center text-sm"
        >
          -
        </button>
        <span className="text-white min-w-[2rem] text-center">
          {cartItem.quantity}
        </span>
        <button
          onClick={() => handleQuantityChange(1)}
          className="cosmic-button cosmic-button-secondary w-8 h-8 p-0 flex items-center justify-center text-sm"
        >
          +
        </button>
      </div>
    )
  }

  const buttonClass = variant === 'primary' 
    ? 'cosmic-button cosmic-button-primary' 
    : 'cosmic-button cosmic-button-secondary'

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={`${buttonClass} disabled:opacity-50 transition-all duration-200 ${
        showSuccess ? 'bg-green-500 hover:bg-green-600' : ''
      } ${className}`}
    >
      {isAdding ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
          Adding...
        </span>
      ) : showSuccess ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Added!
        </span>
      ) : itemInCart ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          In Cart
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 9M7 13l-1.5-9M7 13h10M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
          </svg>
          Add to Cart
        </span>
      )}
    </button>
  )
}
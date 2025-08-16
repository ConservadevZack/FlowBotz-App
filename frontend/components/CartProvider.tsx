"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useCart } from '@/hooks/useShoppingCart'
import type { CartItem } from '@/hooks/useShoppingCart'

interface CartContextType {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isInCart: (metadata: CartItem['metadata']) => boolean
}

const CartContext = createContext<CartContextType | null>(null)

export const useShoppingCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useShoppingCart must be used within CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: ReactNode
}

export default function CartProvider({ children }: CartProviderProps) {
  const cartState = useCart()

  return (
    <CartContext.Provider value={cartState}>
      {children}
    </CartContext.Provider>
  )
}
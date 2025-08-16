"use client"

import { useState, useEffect, createContext, useContext } from 'react'

export interface CartItem {
  id: string
  type: 'design' | 'subscription' | 'credits'
  name: string
  description: string
  price: number
  quantity: number
  imageUrl?: string
  metadata: {
    designId?: string
    productId?: string
    variantId?: string
    subscriptionPriceId?: string
    credits?: number
  }
}

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

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('flowbotz-cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('flowbotz-cart', JSON.stringify(items))
  }, [items])

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    const id = `${newItem.type}-${Date.now()}-${Math.random()}`
    
    // Check if item already exists (for design products)
    const existingIndex = items.findIndex(item => 
      item.metadata.designId === newItem.metadata.designId &&
      item.metadata.productId === newItem.metadata.productId &&
      item.metadata.variantId === newItem.metadata.variantId
    )

    if (existingIndex >= 0) {
      // Update quantity of existing item
      setItems(prev => prev.map((item, index) => 
        index === existingIndex 
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      ))
    } else {
      // Add new item
      setItems(prev => [...prev, { ...newItem, id }])
    }
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }

    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ))
  }

  const clearCart = () => {
    setItems([])
  }

  const isInCart = (metadata: CartItem['metadata']) => {
    return items.some(item => 
      item.metadata.designId === metadata.designId &&
      item.metadata.productId === metadata.productId &&
      item.metadata.variantId === metadata.variantId
    )
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart
  }
}
// Centralized API configuration and utilities for FlowBotz
import { supabase } from './supabase'

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
    PROFILE: '/api/auth/profile'
  },
  
  // AI Services
  AI: {
    GENERATE_IMAGE: '/api/ai/generate-image',
    GENERATE_IMAGE_STREAM: '/api/ai/generate-image-stream',
    CHAT: '/api/ai/chat',
    MODELS: '/api/ai/models',
    WORKFLOW_SUGGESTION: '/api/ai/workflow-suggestion',
    GENERATION_STATS: '/api/ai/generation-stats',
    OPTIMIZE_PROMPT: '/api/ai/optimize-prompt',
    WEBSOCKET_PROGRESS: (userId: string) => `/api/ai/ws/generate-progress/${userId}`
  },
  
  // Designs
  DESIGNS: {
    LIST: '/api/designs',
    CREATE: '/api/designs',
    GET: (id: string) => `/api/designs/${id}`,
    UPDATE: (id: string) => `/api/designs/${id}`,
    DELETE: (id: string) => `/api/designs/${id}`,
    DUPLICATE: (id: string) => `/api/designs/${id}/duplicate`,
    CATEGORIES: '/api/designs/categories',
    TEMPLATES: '/api/designs/templates'
  },
  
  // Print-on-Demand
  POD: {
    PRODUCTS: '/api/pod/products',
    CATEGORIES: '/api/pod/categories',
    UNIFIED_PRODUCTS: '/api/pod/products/unified',
    MOCKUP: '/api/pod/mockup',
    ORDER: '/api/pod/order',
    ORDER_STATUS: (id: string) => `/api/pod/order/${id}`,
    PRODUCT_SPECS: (id: string) => `/api/pod/product-specs/${id}`,
    SHIPPING_RATES: '/api/pod/shipping-rates'
  },
  
  // Payments
  PAYMENTS: {
    CREATE_INTENT: '/api/payments/create-payment-intent',
    CREATE_SUBSCRIPTION: '/api/payments/create-subscription',
    PURCHASE_PRODUCT: '/api/payments/purchase-product',
    WEBHOOK: '/api/payments/webhook',
    REFUND: '/api/payments/refund',
    PAYMENT_HISTORY: '/api/payments/payment-history',
    SUBSCRIPTION_STATUS: '/api/payments/subscription-status',
    PRICING: '/api/payments/pricing',
    CREDITS: '/api/payments/credits',
    PURCHASE_CREDITS: '/api/payments/purchase-credits'
  },
  
  // Webhooks
  WEBHOOKS: {
    STRIPE: '/api/webhooks/stripe',
    PRINTFUL: '/api/webhooks/printful',
    PRINTIFY: '/api/webhooks/printify'
  }
}

// CSRF token storage
let csrfToken: string | null = null

// Get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken
  }
  
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/api/ai/csrf-token`, {
      headers
    })
    
    if (!response.ok) {
      throw new Error('Failed to get CSRF token')
    }
    
    const data = await response.json()
    csrfToken = data.csrf_token
    return csrfToken
  } catch (error) {
    console.error('Failed to get CSRF token:', error)
    throw new Error('CSRF token required')
  }
}

// Helper function to get authenticated headers
export const getAuthHeaders = async (includeCSRF: boolean = false): Promise<HeadersInit> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.access_token) {
      throw new Error('User not authenticated')
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
    
    if (includeCSRF) {
      const token = await getCSRFToken()
      headers['X-CSRF-Token'] = token
    }
    
    return headers
  } catch (error) {
    console.error('Failed to get auth headers:', error)
    throw new Error('Authentication required')
  }
}

// Generic API request function with authentication
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const method = options.method || 'GET'
    const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
    const headers = await getAuthHeaders(needsCSRF)
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error [${response.status}]:`, errorText)
      
      // Clear CSRF token on 403 errors (invalid/expired token)
      if (response.status === 403 && needsCSRF) {
        csrfToken = null
      }
      
      throw new Error(`API request failed: ${response.status} ${errorText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// Specific API service functions
export const apiService = {
  // AI Services
  ai: {
    generateImage: async (prompt: string, model = 'dall-e-3', size = '1024x1024', style = 'photorealistic') => {
      return apiRequest(API_ENDPOINTS.AI.GENERATE_IMAGE, {
        method: 'POST',
        body: JSON.stringify({ prompt, model, size, style })
      })
    },
    
    generateImageStream: async (prompt: string, model = 'dall-e-3', size = '1024x1024', style = 'photorealistic', quality_mode = 'balanced') => {
      return apiRequest(API_ENDPOINTS.AI.GENERATE_IMAGE_STREAM, {
        method: 'POST',
        body: JSON.stringify({ prompt, model, size, style, quality_mode })
      })
    },
    
    chat: async (messages: any[], model = 'gpt-3.5-turbo') => {
      return apiRequest(API_ENDPOINTS.AI.CHAT, {
        method: 'POST',
        body: JSON.stringify({ messages, model })
      })
    },
    
    getModels: async () => {
      return apiRequest(API_ENDPOINTS.AI.MODELS)
    },
    
    getGenerationStats: async () => {
      return apiRequest(API_ENDPOINTS.AI.GENERATION_STATS)
    },
    
    optimizePrompt: async (prompt: string, quality_mode = 'balanced') => {
      return apiRequest(API_ENDPOINTS.AI.OPTIMIZE_PROMPT, {
        method: 'POST',
        body: JSON.stringify({ prompt, quality_mode })
      })
    },
    
    createWebSocketConnection: (userId: string): WebSocket => {
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}${API_ENDPOINTS.AI.WEBSOCKET_PROGRESS(userId)}`
      return new WebSocket(wsUrl)
    }
  },
  
  // Design Services
  designs: {
    list: async (status?: string, limit = 20) => {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      params.append('limit', limit.toString())
      
      return apiRequest(`${API_ENDPOINTS.DESIGNS.LIST}?${params}`)
    },
    
    create: async (designData: any) => {
      return apiRequest(API_ENDPOINTS.DESIGNS.CREATE, {
        method: 'POST',
        body: JSON.stringify(designData)
      })
    },
    
    get: async (id: string) => {
      return apiRequest(API_ENDPOINTS.DESIGNS.GET(id))
    },
    
    update: async (id: string, updateData: any) => {
      return apiRequest(API_ENDPOINTS.DESIGNS.UPDATE(id), {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
    },
    
    delete: async (id: string) => {
      return apiRequest(API_ENDPOINTS.DESIGNS.DELETE(id), {
        method: 'DELETE'
      })
    }
  },
  
  // POD Services
  pod: {
    getProducts: async (category = 'apparel', provider = 'printful') => {
      const params = new URLSearchParams({ category, provider })
      return apiRequest(`${API_ENDPOINTS.POD.PRODUCTS}?${params}`)
    },
    
    generateMockup: async (product_id: string, design_url: string, variant_id: string, placement = 'front') => {
      return apiRequest(API_ENDPOINTS.POD.MOCKUP, {
        method: 'POST',
        body: JSON.stringify({ product_id, design_url, variant_id, placement })
      })
    },
    
    createOrder: async (orderData: any) => {
      return apiRequest(API_ENDPOINTS.POD.ORDER, {
        method: 'POST',
        body: JSON.stringify(orderData)
      })
    },
    
    getProductSpecs: async (productId: string, provider = 'printful') => {
      const params = new URLSearchParams({ provider })
      return apiRequest(`${API_ENDPOINTS.POD.PRODUCT_SPECS(productId)}?${params}`)
    }
  },
  
  // Payment Services
  payments: {
    createPaymentIntent: async (amount: number, currency = 'usd', metadata = {}) => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.CREATE_INTENT, {
        method: 'POST',
        body: JSON.stringify({ amount: amount * 100, currency, metadata }) // Convert to cents
      })
    },
    
    createSubscription: async (priceId: string, metadata = {}) => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.CREATE_SUBSCRIPTION, {
        method: 'POST',
        body: JSON.stringify({ price_id: priceId, metadata })
      })
    },
    
    purchaseProduct: async (productData: any) => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.PURCHASE_PRODUCT, {
        method: 'POST',
        body: JSON.stringify(productData)
      })
    },
    
    getSubscriptionStatus: async () => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.SUBSCRIPTION_STATUS)
    },
    
    cancelSubscription: async () => {
      return apiRequest('/api/payments/cancel-subscription', {
        method: 'POST'
      })
    },
    
    reactivateSubscription: async () => {
      return apiRequest('/api/payments/reactivate-subscription', {
        method: 'POST'
      })
    },
    
    getPaymentHistory: async (limit = 10, startingAfter?: string) => {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (startingAfter) params.append('starting_after', startingAfter)
      
      return apiRequest(`${API_ENDPOINTS.PAYMENTS.PAYMENT_HISTORY}?${params}`)
    },
    
    getPricing: async () => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.PRICING)
    },
    
    getCredits: async () => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.CREDITS)
    },
    
    purchaseCredits: async (credits: number) => {
      return apiRequest(API_ENDPOINTS.PAYMENTS.PURCHASE_CREDITS, {
        method: 'POST',
        body: JSON.stringify({ credits })
      })
    }
  }
}

// Error handling utilities
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Retry mechanism for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      console.warn(`Request attempt ${attempt} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
  
  throw new Error('Max retry attempts exceeded')
}
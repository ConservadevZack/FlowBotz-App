// Configuration validation for FlowBotz
export const config = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Supabase Configuration
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  
  // Feature Flags
  ENABLE_AI_GENERATION: process.env.NEXT_PUBLIC_ENABLE_AI_GENERATION === 'true',
  ENABLE_PAYMENTS: process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === 'true',
  ENABLE_BETA_FEATURES: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true',
  
  // AI Model Configuration
  IMAGEN4_ENABLED: process.env.NEXT_PUBLIC_IMAGEN4_ENABLED === 'true',
  FLUX_KONTEXT_ENABLED: process.env.NEXT_PUBLIC_FLUX_KONTEXT_ENABLED === 'true',
  SD35_ENABLED: process.env.NEXT_PUBLIC_SD35_ENABLED === 'true',
  
  // POD Configuration
  PRINTFUL_ENABLED: process.env.NEXT_PUBLIC_PRINTFUL_ENABLED === 'true',
  PRINTIFY_ENABLED: process.env.NEXT_PUBLIC_PRINTIFY_ENABLED === 'true'
}

// Validation function
export const validateConfig = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_PUBLISHABLE_KEY'
  ]
  
  const missing = required.filter(key => !config[key as keyof typeof config])
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    return false
  }
  
  return true
}

// Initialize configuration check
if (typeof window !== 'undefined') {
  validateConfig()
}
'use client'

import { useState, useCallback, useMemo } from 'react'
import Navigation from '../components/Navigation'
import {
  StepProgressIndicator,
  DesignPromptStep,
  ProductSelectionStep,
  OrderCompletionStep,
  Product,
  CreatorState,
  products
} from '../../components/creator'

export default function CreatorPage() {
  const [state, setState] = useState<CreatorState>({
    currentStep: 1,
    prompt: '',
    generatedImage: null,
    selectedProduct: null,
    selectedVariant: '',
    isGenerating: false
  })

  const handleGenerateImage = useCallback(async () => {
    if (!state.prompt.trim()) return
    
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      // Get Supabase session token
      const { supabase } = await import('../../lib/supabase')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        throw new Error('User not authenticated. Please sign in first.')
      }
      
      const response = await fetch('http://localhost:8000/api/ai/generate-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          prompt: state.prompt.trim(),
          model: 'flux-kontext',
          size: '1024x1024',
          style: 'photorealistic'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          generatedImage: data.url || data.imageUrl,
          currentStep: 2,
          isGenerating: false
        }))
      } else {
        const errorText = await response.text()
        console.error('AI generation failed:', response.status, errorText)
        alert(`Failed to generate image: ${response.status} ${errorText}`)
        setState(prev => ({ ...prev, isGenerating: false }))
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate image'}`)
      setState(prev => ({ ...prev, isGenerating: false }))
    }
  }, [state.prompt])

  const handleProductSelect = useCallback((product: Product) => {
    setState(prev => ({
      ...prev,
      selectedProduct: product,
      selectedVariant: product.variants[0].id,
      currentStep: 3
    }))
  }, [])

  const handleOrderProduct = useCallback(() => {
    if (!state.selectedProduct || !state.selectedVariant || !state.generatedImage) return
    
    const variant = state.selectedProduct.variants.find(v => v.id === state.selectedVariant)
    if (!variant) return
    
    alert(`Order placed for ${state.selectedProduct.name} (${variant.name}) - $${variant.price}!\nThis is a demo - payment processing will be implemented soon.`)
    
    // Reset to step 1 for new design
    setState({
      currentStep: 1,
      prompt: '',
      generatedImage: null,
      selectedProduct: null,
      selectedVariant: '',
      isGenerating: false
    })
  }, [state.selectedProduct, state.selectedVariant, state.generatedImage])

  const stepTitle = useMemo(() => {
    switch (state.currentStep) {
      case 1: return "Step 1: Describe Your Design"
      case 2: return "Step 2: Choose Your Product"
      case 3: return "Step 3: Complete Your Order"
      default: return "Create Your Design"
    }
  }, [state.currentStep])

  const handlePromptChange = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }))
  }, [])

  const handleVariantChange = useCallback((variantId: string) => {
    setState(prev => ({ ...prev, selectedVariant: variantId }))
  }, [])

  return (
    <div style={{ 
      minHeight: '100vh', 
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Navigation />
      
      <div style={{ paddingTop: '100px', padding: '100px 24px 60px' }}>
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
              {stepTitle}
            </h1>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Transform your imagination into beautiful, custom products with AI-powered design
            </p>
          </div>

          <StepProgressIndicator 
            currentStep={state.currentStep} 
            totalSteps={3} 
          />

          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '48px'
          }}>
            {state.currentStep === 1 && (
              <DesignPromptStep
                prompt={state.prompt}
                isGenerating={state.isGenerating}
                onPromptChange={handlePromptChange}
                onGenerate={handleGenerateImage}
              />
            )}

            {state.currentStep === 2 && (
              <ProductSelectionStep
                products={products}
                generatedImage={state.generatedImage}
                onProductSelect={handleProductSelect}
              />
            )}

            {state.currentStep === 3 && state.selectedProduct && (
              <OrderCompletionStep
                product={state.selectedProduct}
                selectedVariant={state.selectedVariant}
                generatedImage={state.generatedImage}
                onVariantChange={handleVariantChange}
                onPlaceOrder={handleOrderProduct}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
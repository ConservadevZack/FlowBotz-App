'use client'

import { useState } from 'react'
import Navigation from '../components/Navigation'

// Product data
const products = [
  {
    id: 1,
    name: "Premium T-Shirt",
    category: "Apparel",
    variants: [
      { id: "ts-s", name: "Small", price: 24.99 },
      { id: "ts-m", name: "Medium", price: 24.99 },
      { id: "ts-l", name: "Large", price: 24.99 },
      { id: "ts-xl", name: "X-Large", price: 26.99 }
    ]
  },
  {
    id: 2,
    name: "Canvas Tote Bag",
    category: "Accessories",
    variants: [
      { id: "tb-reg", name: "Regular", price: 18.99 },
      { id: "tb-lg", name: "Large", price: 22.99 }
    ]
  },
  {
    id: 3,
    name: "Coffee Mug",
    category: "Drinkware",
    variants: [
      { id: "mug-11", name: "11oz", price: 16.99 },
      { id: "mug-15", name: "15oz", price: 18.99 }
    ]
  },
  {
    id: 4,
    name: "Poster Print",
    category: "Wall Art",
    variants: [
      { id: "poster-12x16", name: "12\" x 16\"", price: 15.99 },
      { id: "poster-18x24", name: "18\" x 24\"", price: 25.99 },
      { id: "poster-24x36", name: "24\" x 36\"", price: 35.99 }
    ]
  }
]

export default function CreatorPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
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
          prompt: prompt.trim(),
          model: 'flux-kontext',
          size: '1024x1024',
          style: 'photorealistic'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedImage(data.url || data.imageUrl)
        setCurrentStep(2)
      } else {
        const errorText = await response.text()
        console.error('AI generation failed:', response.status, errorText)
        alert(`Failed to generate image: ${response.status} ${errorText}`)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate image'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product)
    setSelectedVariant(product.variants[0].id)
    setCurrentStep(3)
  }

  const handleOrderProduct = () => {
    if (!selectedProduct || !selectedVariant || !generatedImage) return
    
    const variant = selectedProduct.variants.find(v => v.id === selectedVariant)
    if (!variant) return
    
    alert(`Order placed for ${selectedProduct.name} (${variant.name}) - $${variant.price}!\nThis is a demo - payment processing will be implemented soon.`)
    
    // Reset to step 1 for new design
    setCurrentStep(1)
    setPrompt('')
    setGeneratedImage(null)
    setSelectedProduct(null)
    setSelectedVariant('')
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Step 1: Describe Your Design"
      case 2: return "Step 2: Choose Your Product"
      case 3: return "Step 3: Complete Your Order"
      default: return "Create Your Design"
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0B1426',
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
              {getStepTitle()}
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

          {/* Progress Steps */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[1, 2, 3].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    background: step <= currentStep 
                      ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: step <= currentStep ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div style={{
                      width: '64px',
                      height: '4px',
                      margin: '0 16px',
                      background: step < currentStep 
                        ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                        : 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '48px'
          }}>
            
            {/* Step 1: Describe Design */}
            {currentStep === 1 && (
              <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#fff' }}>
                  What would you like to create?
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '32px', fontSize: '16px' }}>
                  Describe your design idea in detail. The more specific you are, the better the AI can bring your vision to life.
                </p>
                
                <div style={{ marginBottom: '32px' }}>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: A vibrant sunset over mountains with geometric patterns, in a retro synthwave style with purple and orange colors..."
                    style={{
                      width: '100%',
                      height: '150px',
                      padding: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '16px',
                      resize: 'none',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || isGenerating}
                  style={{
                    width: '100%',
                    padding: '20px',
                    background: isGenerating 
                      ? 'rgba(139, 92, 246, 0.3)'
                      : 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: isGenerating || !prompt.trim() ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isGenerating ? 'Generating Design...' : 'Generate Design'}
                </button>
              </div>
            )}

            {/* Step 2: Choose Product */}
            {currentStep === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#fff' }}>
                    Choose Your Product
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px' }}>
                    Select the product you'd like to apply your design to.
                  </p>
                </div>

                {generatedImage && (
                  <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                      display: 'inline-block',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '24px',
                      borderRadius: '16px'
                    }}>
                      <img 
                        src={generatedImage} 
                        alt="Generated design" 
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          cursor: 'pointer'
                        }}
                      />
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginTop: '12px' }}>
                        Your Generated Design
                      </p>
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '24px'
                }}>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{
                        height: '120px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}>
                        <span style={{ fontSize: '48px' }}>📦</span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                        {product.name}
                      </h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
                        {product.category}
                      </p>
                      <p style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
                        From ${Math.min(...product.variants.map(v => v.price))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Order */}
            {currentStep === 3 && selectedProduct && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#fff' }}>
                    Complete Your Order
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px' }}>
                    Review your design and place your order.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '32px',
                  alignItems: 'start'
                }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
                      Product Details
                    </h3>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
                        Size/Variant
                      </label>
                      <select
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      >
                        {selectedProduct.variants.map((variant: any) => (
                          <option key={variant.id} value={variant.id} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                            {variant.name} - ${variant.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
                        Order Summary
                      </h4>
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{selectedProduct.name}</span>
                          <span style={{ color: '#fff' }}>
                            ${selectedProduct.variants.find(v => v.id === selectedVariant)?.price}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Shipping</span>
                          <span style={{ color: '#fff' }}>$4.99</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                            <span style={{ color: '#fff' }}>Total</span>
                            <span style={{ color: '#8B5CF6' }}>
                              ${((selectedProduct.variants.find(v => v.id === selectedVariant)?.price || 0) + 4.99).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleOrderProduct}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Place Order
                    </button>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
                      Final Preview
                    </h3>
                    {generatedImage && (
                      <img 
                        src={generatedImage} 
                        alt="Final product" 
                        style={{
                          width: '100%',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
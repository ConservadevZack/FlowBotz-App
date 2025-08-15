"use client"

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import FloatingNavbar from '@/components/FloatingNavbar'
import PaymentModal from '@/components/PaymentModal'
import ImageDialog from '@/components/ImageDialog'
import ProductDesignOverlay from '@/components/ProductDesignOverlay'
import { useAuth } from '@/components/AuthProvider'

// Product data
const products = [
  {
    id: 1,
    name: "Premium T-Shirt",
    image: "/api/placeholder/300/300",
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
    image: "/api/placeholder/300/300",
    category: "Accessories",
    variants: [
      { id: "tb-reg", name: "Regular", price: 18.99 },
      { id: "tb-lg", name: "Large", price: 22.99 }
    ]
  },
  {
    id: 3,
    name: "Coffee Mug",
    image: "/api/placeholder/300/300",
    category: "Drinkware",
    variants: [
      { id: "mug-11", name: "11oz", price: 16.99 },
      { id: "mug-15", name: "15oz", price: 18.99 }
    ]
  },
  {
    id: 4,
    name: "Poster Print",
    image: "/api/placeholder/300/300",
    category: "Wall Art",
    variants: [
      { id: "poster-12x16", name: "12\" x 16\"", price: 15.99 },
      { id: "poster-18x24", name: "18\" x 24\"", price: 25.99 },
      { id: "poster-24x36", name: "24\" x 36\"", price: 35.99 }
    ]
  }
]

export default function SimplifiedCreatorPage() {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [orderTotal, setOrderTotal] = useState(0)
  const [accurateMockup, setAccurateMockup] = useState<string | null>(null)
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false)
  const [productSpecs, setProductSpecs] = useState<any>(null)
  const [loadingSpecs, setLoadingSpecs] = useState(false)

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      // Get Supabase session token
      const { supabase } = await import('@/lib/supabase')
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

  const generateAccurateMockup = async () => {
    if (!selectedProduct || !generatedImage) return
    
    setIsGeneratingMockup(true)
    try {
      // Get Supabase session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.error('User not authenticated for mockup generation')
        setCurrentStep(4)
        return
      }
      
      const response = await fetch('http://localhost:8000/api/mockup/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          designImageUrl: generatedImage,
          variantId: selectedVariant
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccurateMockup(data.mockupUrl || data.url)
      } else {
        console.error('Mockup generation failed:', response.status, await response.text())
      }
      setCurrentStep(4)
    } catch (error) {
      console.error('Error generating mockup:', error)
      setCurrentStep(4)
    } finally {
      setIsGeneratingMockup(false)
    }
  }

  const loadProductSpecs = async (productId: number) => {
    setLoadingSpecs(true)
    try {
      // Get Supabase session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        console.error('User not authenticated for product specs')
        setLoadingSpecs(false)
        return
      }
      
      const response = await fetch(`http://localhost:8000/api/pod/product-specs/${productId}?provider=printful`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const specsData = await response.json()
        setProductSpecs(specsData.specifications)
      } else {
        console.error('Failed to load product specs:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error loading product specifications:', error)
    } finally {
      setLoadingSpecs(false)
    }
  }

  const handleOrderProduct = () => {
    if (!selectedProduct || !selectedVariant || !generatedImage) return
    
    const variant = selectedProduct.variants.find(v => v.id === selectedVariant)
    if (!variant) return
    
    const productCost = variant.price
    const shippingCost = 4.99
    const total = productCost + shippingCost
    
    setOrderTotal(total)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent)
    alert('Order placed successfully! You will receive an email confirmation.')
    setShowPaymentModal(false)
    
    // Reset to step 1 for new design
    setCurrentStep(1)
    setPrompt('')
    setGeneratedImage(null)
    setSelectedProduct(null)
    setSelectedVariant('')
    setAccurateMockup(null)
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error)
    alert(`Payment failed: ${error}`)
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Step 1: Describe Your Design"
      case 2: return "Step 2: Choose Your Product"
      case 3: return "Step 3: Preview Your Design"
      case 4: return "Step 4: Complete Your Order"
      default: return "Create Your Design"
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-16 pb-8">
        <FloatingNavbar />
        
        {/* Moving background */}
        <div className="cosmic-moving-background">
          <div className="cosmic-orb cosmic-orb-1"></div>
          <div className="cosmic-orb cosmic-orb-2"></div>
          <div className="cosmic-orb cosmic-orb-3"></div>
          <div className="cosmic-orb cosmic-orb-4"></div>
          <div className="cosmic-orb cosmic-orb-5"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="cosmic-card-premium p-8 sm:p-10">
              <h1 className="text-display-medium cosmic-text-gradient mb-6 tracking-tight">
                {getStepTitle()}
              </h1>
              <p className="text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
                Transform your imagination into beautiful, custom products with AI-powered design
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="cosmic-card-premium p-8 mb-10">
            <div className="flex items-center justify-center">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-lg font-bold transition-all duration-300 ${
                    step <= currentStep 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'bg-white/10 text-white/60 border border-white/20'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-12 sm:w-16 h-1 mx-3 sm:mx-4 transition-all duration-300 ${
                      step < currentStep ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="cosmic-card-premium p-8 sm:p-10 lg:p-12">
            {/* Step 1: Describe Design */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center space-y-6">
                  <h2 className="text-2xl text-white font-bold">What would you like to create?</h2>
                  <p className="text-white/70 text-lg leading-relaxed max-w-3xl mx-auto">Describe your design idea in detail. The more specific you are, the better the AI can bring your vision to life.</p>
                </div>
                
                <div className="space-y-8 max-w-3xl mx-auto">
                  <div>
                    <label htmlFor="prompt" className="block text-base font-semibold text-white mb-4">
                      Design Description
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="cosmic-input-premium w-full h-36 py-5 px-6 resize-none text-base"
                      placeholder="Example: A vibrant sunset over mountains with geometric patterns, in a retro synthwave style with purple and orange colors..."
                    />
                  </div>
                  
                  <button
                    onClick={handleGenerateImage}
                    disabled={!prompt.trim() || isGenerating}
                    className="w-full cosmic-button-premium cosmic-button-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[64px] font-bold"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        Generating Design...
                      </div>
                    ) : (
                      'Generate Design'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Choose Product */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center space-y-6">
                  <h2 className="text-2xl text-white font-bold">Choose Your Product</h2>
                  <p className="text-white/70 text-lg leading-relaxed max-w-3xl mx-auto">Select the product you'd like to apply your design to.</p>
                </div>

                {generatedImage && (
                  <div className="text-center mb-10">
                    <div className="inline-block cosmic-card-premium p-6">
                      <img 
                        src={generatedImage} 
                        alt="Generated design" 
                        className="w-56 h-56 object-cover mx-auto rounded-xl cursor-pointer hover:scale-105 transition-transform shadow-2xl"
                        onClick={() => setShowImageDialog(true)}
                      />
                      <p className="text-white/70 text-base mt-4 font-medium">Your Generated Design</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="cosmic-card-premium group cursor-pointer p-8 text-center hover:scale-105 transition-transform min-h-[280px] flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                          <span className="text-5xl">📦</span>
                        </div>
                        <h3 className="text-xl text-white font-bold">{product.name}</h3>
                        <p className="text-white/60 text-base">{product.category}</p>
                      </div>
                      <p className="text-purple-400 font-bold text-lg mt-4">
                        From ${Math.min(...product.variants.map(v => v.price))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Preview Design */}
            {currentStep === 3 && selectedProduct && (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-h2 text-white font-bold">Preview Your Design</h2>
                  <p className="text-white/70">See how your design looks on the {selectedProduct.name}.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="cosmic-card p-6">
                      <h3 className="text-h4 text-white font-bold mb-4">Product Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-white mb-2">Size/Variant</label>
                          <select
                            value={selectedVariant}
                            onChange={(e) => setSelectedVariant(e.target.value)}
                            className="cosmic-input w-full py-3 px-4"
                          >
                            {selectedProduct.variants.map((variant: any) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.name} - ${variant.price}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateAccurateMockup}
                      disabled={isGeneratingMockup}
                      className="w-full cosmic-button cosmic-button-primary cosmic-button-lg"
                    >
                      {isGeneratingMockup ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Creating Preview...
                        </div>
                      ) : (
                        'Continue to Order'
                      )}
                    </button>
                  </div>

                  <div className="cosmic-card p-6">
                    <h3 className="text-h4 text-white font-bold mb-4">Design Preview</h3>
                    {accurateMockup ? (
                      <img 
                        src={accurateMockup} 
                        alt="Product mockup" 
                        className="w-full rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setShowImageDialog(true)}
                      />
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-white/60">Mockup Preview</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Order */}
            {currentStep === 4 && selectedProduct && (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-h2 text-white font-bold">Complete Your Order</h2>
                  <p className="text-white/70">Review your design and place your order.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="cosmic-card p-6">
                    <h3 className="text-h4 text-white font-bold mb-4">Order Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/70">{selectedProduct.name}</span>
                        <span className="text-white">
                          ${selectedProduct.variants.find(v => v.id === selectedVariant)?.price}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Shipping</span>
                        <span className="text-white">$4.99</span>
                      </div>
                      <div className="border-t border-white/20 pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-white">Total</span>
                          <span className="text-purple-400">
                            ${((selectedProduct.variants.find(v => v.id === selectedVariant)?.price || 0) + 4.99).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleOrderProduct}
                      className="w-full cosmic-button cosmic-button-primary cosmic-button-lg mt-6"
                    >
                      Place Order
                    </button>
                  </div>

                  <div className="cosmic-card p-6">
                    <h3 className="text-h4 text-white font-bold mb-4">Final Preview</h3>
                    {accurateMockup && (
                      <img 
                        src={accurateMockup} 
                        alt="Final product" 
                        className="w-full rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setShowImageDialog(true)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        product={selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          variant: selectedVariant,
          quantity: 1,
          designUrl: generatedImage || ''
        } : undefined}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      {/* Image Dialog */}
      <ImageDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        imageUrl={generatedImage || ''}
        title="Your Design"
      />
    </ProtectedRoute>
  )
}
"use client"

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import FloatingNavbar from '@/components/FloatingNavbar'
import { useAuth } from '@/components/AuthProvider'

export default function CreatePage() {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('flux-kontext')
  const [selectedSize, setSelectedSize] = useState('1024x1024')
  const [selectedStyle, setSelectedStyle] = useState('photorealistic')
  const [selectedProduct, setSelectedProduct] = useState('t-shirt')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'generate' | 'customize' | 'order'>('generate')
  const [generationSettings, setGenerationSettings] = useState({
    quality: 7,
    creativity: 0.7,
    steps: 30
  })

  const aiModels = [
    { id: 'flux-kontext', name: 'FLUX.1 Kontext', description: 'Best for photorealistic images', recommended: true },
    { id: 'sd35', name: 'Stable Diffusion 3.5', description: 'High-quality artistic generation' },
    { id: 'imagen4', name: 'Imagen 4', description: 'Advanced text understanding' }
  ]

  const quickPrompts = [
    "A majestic cosmic wolf howling at nebula stars",
    "Abstract geometric patterns in neon colors",
    "Minimalist mountain landscape at sunset", 
    "Retro synthwave cityscape with palm trees",
    "Watercolor floral design with butterflies"
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      // Use real API endpoint with proper authentication
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:8000/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
          width: parseInt(selectedSize.split('x')[0]),
          height: parseInt(selectedSize.split('x')[1]),
          style: selectedStyle,
          steps: generationSettings.steps,
          guidance_scale: generationSettings.creativity * 10,
          quality: generationSettings.quality
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedImage(data.image_url)
      } else {
        // For demo purposes, show a placeholder
        setGeneratedImage(`https://picsum.photos/1024/1024?random=${Date.now()}`)
      }
      
      // Update user's generation count
      // const user = authService.getUser()
      // if (user) {
      //   user.generationsUsed += 1
      // }
    } catch (error) {
      console.error('Generation failed:', error)
      // For demo purposes, still show a placeholder
      setGeneratedImage(`https://picsum.photos/1024/1024?random=${Date.now()}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToGallery = async () => {
    if (!generatedImage) return
    
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:8000/designs/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
          prompt,
          image_url: generatedImage,
          model: selectedModel,
          style: selectedStyle,
          size: selectedSize
        })
      })

      if (response.ok) {
        alert('Design saved to your gallery!')
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-20 pb-6">
        <FloatingNavbar />
        
        {/* Moving background */}
        <div className="cosmic-moving-background">
          <div className="cosmic-orb cosmic-orb-1"></div>
          <div className="cosmic-orb cosmic-orb-2"></div>
          <div className="cosmic-orb cosmic-orb-3"></div>
          <div className="cosmic-orb cosmic-orb-4"></div>
          <div className="cosmic-orb cosmic-orb-5"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-7rem)]">
          {/* Compact Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-h3 cosmic-text-gradient">AI Design Studio</h1>
                <p className="text-sm text-white/60">Welcome back, {user?.user_metadata?.first_name || 'Creator'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-white/60">
                  <span className="text-green-400">●</span> Generations: 3/5 remaining
                </div>
                <div className="cosmic-button cosmic-button-ghost cosmic-button-sm">
                  Upgrade Plan
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-12rem)]">
            
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1 space-y-4 overflow-y-auto">
              {/* Quick Actions */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">⚡</span>Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    🎨 New Design
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    📁 My Gallery
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    🛍️ Order History
                  </button>
                </div>
              </div>

              {/* AI Model Selection */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">AI Model</h3>
                <div className="space-y-2">
                  {aiModels.map((model) => (
                    <label key={model.id} className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="mr-2 w-3 h-3 text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white">{model.name}</div>
                        {model.recommended && (
                          <span className="text-xs text-green-400">✨ Recommended</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/80 mb-1">Size</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="cosmic-select w-full px-2 py-1 text-xs"
                    >
                      <option value="1024x1024">Square (1024×1024)</option>
                      <option value="1024x768">Landscape (1024×768)</option>
                      <option value="768x1024">Portrait (768×1024)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/80 mb-1">Style</label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="cosmic-select w-full px-2 py-1 text-xs"
                    >
                      <option value="photorealistic">Photorealistic</option>
                      <option value="artistic">Artistic</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="abstract">Abstract</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Product Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['t-shirt', 'hoodie', 'poster', 'mug'].map((product) => (
                    <button
                      key={product}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-2 text-xs rounded-lg border transition-colors ${
                        selectedProduct === product 
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {product.charAt(0).toUpperCase() + product.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Panel - Generation */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Prompt Input */}
              <div className="cosmic-card p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Describe Your Design</h3>
                  <span className="text-xs text-white/60">{prompt.length}/500</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  placeholder="A cosmic wolf howling at neon stars..."
                  className="cosmic-input w-full h-20 px-3 py-2 text-sm resize-none"
                  maxLength={500}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {quickPrompts.slice(0, 3).map((quickPrompt, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(quickPrompt)}
                      className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      {quickPrompt.slice(0, 20)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation Area */}
              <div className="cosmic-card flex-1 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Preview</h3>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="cosmic-button cosmic-button-primary cosmic-button-sm disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating...
                      </span>
                    ) : (
                      '✨ Generate'
                    )}
                  </button>
                </div>
                
                <div className="flex-1 flex items-center justify-center bg-white/5 rounded-xl border-2 border-dashed border-white/20">
                  {generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated design" 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-white/60">
                      <div className="text-4xl mb-2">🎨</div>
                      <p className="text-sm">Your generated design will appear here</p>
                    </div>
                  )}
                </div>
                
                {generatedImage && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveToGallery}
                      className="cosmic-button cosmic-button-ghost cosmic-button-sm flex-1"
                    >
                      💾 Save to Gallery
                    </button>
                    <button
                      onClick={() => setActiveTab('customize')}
                      className="cosmic-button cosmic-button-secondary cosmic-button-sm flex-1"
                    >
                      🎯 Customize Product
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Product Preview & Order */}
            <div className="lg:col-span-1 space-y-4 overflow-y-auto">
              {/* Product Preview */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">👕</span>Product Preview
                </h3>
                <div className="bg-white/5 rounded-lg p-4 aspect-square flex items-center justify-center">
                  {generatedImage ? (
                    <div className="relative">
                      <div className="w-full h-24 bg-gray-600 rounded-lg flex items-center justify-center">
                        <img 
                          src={generatedImage} 
                          alt="Product preview" 
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                      <div className="text-center mt-2">
                        <div className="text-xs text-white/80 capitalize">{selectedProduct}</div>
                        <div className="text-xs text-green-400">$24.99</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/60">
                      <div className="text-2xl mb-1">👕</div>
                      <p className="text-xs">Product preview</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Total Designs:</span>
                    <span className="text-white">12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Orders:</span>
                    <span className="text-white">3</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Plan:</span>
                    <span className="text-green-400">Starter</span>
                  </div>
                </div>
              </div>

              {/* Recent Designs */}
              <div className="cosmic-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Recent Designs</h3>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center text-xs">
                        🎨
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">Design {i}</div>
                        <div className="text-xs text-white/60">2 hours ago</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
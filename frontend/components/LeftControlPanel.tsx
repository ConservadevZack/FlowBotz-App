"use client"

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
  id: string
  name: string
  description: string
  type: string
  brand: string
  model: string
  image: string
  provider: string
  provider_name: string
  variants: Array<{
    id: string
    name: string
    size: string
    color: string
    color_code: string
    price: number
    in_stock: boolean
    image: string
  }>
}

interface Category {
  name: string
  description: string
  icon: string
  subcategories: string[]
}

interface LeftControlPanelProps {
  // Product selection props
  categories: Record<string, Category>
  products: Product[]
  selectedCategory: string
  selectedProduct: Product | null
  loadingProducts: boolean
  loadingCategories: boolean
  onCategoryChange: (category: string) => void
  onProductSelect: (product: Product) => void
  
  // AI generation props
  designPrompt: string
  isGenerating: boolean
  generatedDesign: string | null
  designHistory: string[]
  onPromptChange: (prompt: string) => void
  onGenerateDesign: () => void
  onSelectHistoryDesign: (design: string) => void
  onClearHistory: () => void
  
  // UI state
  error: string | null
  onErrorDismiss: () => void
}

interface CollapsibleSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  className = ''
}) => {
  return (
    <div className={`border border-white/20 rounded-xl overflow-hidden bg-white/8 backdrop-blur-sm ${className}`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/8 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-white/90 font-medium">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/70"
        >
          ⌄
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-white/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  categories,
  products,
  selectedCategory,
  selectedProduct,
  loadingProducts,
  loadingCategories,
  onCategoryChange,
  onProductSelect,
  designPrompt,
  isGenerating,
  generatedDesign,
  designHistory,
  onPromptChange,
  onGenerateDesign,
  onSelectHistoryDesign,
  onClearHistory,
  error,
  onErrorDismiss
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    products: true,
    ai: false,
    history: false,
    templates: false
  })

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const quickPrompts = [
    "Minimalist geometric wolf silhouette",
    "Vintage retro sunset waves",
    "Abstract neon cyber pattern",
    "Watercolor mountain landscape",
    "Typography motivational quote",
    "Space galaxy with stars",
    "Cartoon cute animals",
    "Grunge rock band logo"
  ]

  return (
    <div className="h-full w-80 flex flex-col bg-gradient-to-b from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-r border-white/20">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Creator Tools</h2>
            <p className="text-white/70 text-sm">Design your product</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-4 mt-4 overflow-hidden"
          >
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-sm">⚠️</span>
                <p className="text-red-300 text-sm flex-1">{error}</p>
                <button 
                  onClick={onErrorDismiss}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Product Selection */}
        <CollapsibleSection
          title="Product Selection"
          icon="👕"
          isExpanded={expandedSections.products}
          onToggle={() => toggleSection('products')}
        >
          <div className="space-y-4">
            {/* Categories */}
            {!loadingCategories && Object.keys(categories).length > 0 && (
              <div>
                <label className="block text-sm text-white/90 mb-3 font-medium">Category</label>
                <div className="space-y-2">
                  {Object.entries(categories).map(([key, category]) => (
                    <button
                      key={key}
                      onClick={() => onCategoryChange(key)}
                      className={`w-full text-left p-3 rounded-lg transition-all border text-sm ${
                        selectedCategory === key
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-white/8 border-white/15 text-white/90 hover:bg-white/12 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-white/50 text-xs">{category.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-white/90 font-medium">Products</label>
                {products.length > 0 && (
                  <span className="text-xs text-white/60">{products.length} available</span>
                )}
              </div>
              
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin mb-3"></div>
                  <span className="text-white/70 text-sm font-medium">Loading products...</span>
                  <span className="text-white/50 text-xs mt-1">Fetching from Printful & Printify</span>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {products.slice(0, 20).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => onProductSelect(product)}
                      className={`group p-2 rounded-lg border transition-all text-xs ${
                        selectedProduct?.id === product.id
                          ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/25 border-purple-500/60 shadow-lg shadow-purple-500/10'
                          : 'bg-white/8 border-white/15 hover:border-white/25 hover:bg-white/12'
                      }`}
                    >
                      <div className="aspect-square rounded-md overflow-hidden mb-2 bg-white/10">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-white/90 text-left">
                        <div className="font-medium truncate text-xs">{product.name.split('|')[0]}</div>
                        <div className="text-white/60 flex items-center gap-1 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            product.provider === 'printful' ? 'bg-blue-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-xs">{product.provider_name}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-3xl mb-3">📦</div>
                  <p className="text-white/70 text-sm font-medium">No products found</p>
                  <p className="text-white/50 text-xs mt-1">Try selecting a different category</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-3 px-3 py-1 text-xs bg-white/8 hover:bg-white/12 rounded-md text-white/70 hover:text-white/90 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-400/30"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* AI Design Generation */}
        <CollapsibleSection
          title="AI Design Generator"
          icon="🎨"
          isExpanded={expandedSections.ai}
          onToggle={() => toggleSection('ai')}
        >
          <div className="space-y-4">
            {/* Selected Product Preview */}
            {selectedProduct && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/70 mb-2">Selected Product:</p>
                <div className="flex items-center gap-2">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-10 h-10 object-cover rounded-md"
                  />
                  <div>
                    <p className="text-white/95 font-medium text-sm">{selectedProduct.name.split('|')[0]}</p>
                    <p className="text-white/60 text-xs">{selectedProduct.provider_name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Design Prompt */}
            <div>
              <label className="block text-sm text-white/90 mb-3 font-medium">Describe your design</label>
              <textarea
                value={designPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="A cosmic wolf howling at neon stars..."
                className="w-full h-24 px-3 py-2 bg-white/8 border border-white/20 rounded-lg text-white/95 placeholder-white/50 text-sm resize-none focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/25 focus:bg-white/10"
                maxLength={500}
              />
              <p className="text-xs text-white/50 mt-1">{designPrompt.length}/500</p>
            </div>
            
            {/* Quick Ideas */}
            <div>
              <p className="text-sm text-white/90 mb-3 font-medium">Quick Ideas</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => onPromptChange(prompt)}
                    className="w-full text-left p-2 text-xs bg-white/8 hover:bg-white/12 rounded text-white/85 hover:text-white/95 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-400/30"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onGenerateDesign}
              disabled={!designPrompt.trim() || isGenerating}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating...
                </span>
              ) : (
                '✨ Generate Design'
              )}
            </button>
          </div>
        </CollapsibleSection>

        {/* Design History */}
        {designHistory.length > 0 && (
          <CollapsibleSection
            title="Design History"
            icon="📋"
            isExpanded={expandedSections.history}
            onToggle={() => toggleSection('history')}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/90 font-medium">{designHistory.length}/5 designs</span>
                <button
                  onClick={onClearHistory}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-1 focus:ring-red-400/50"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {designHistory.map((design, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => onSelectHistoryDesign(design)}
                      className={`w-full aspect-square rounded-md border-2 overflow-hidden transition-all ${
                        generatedDesign === design
                          ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/20'
                          : 'border-white/20 hover:border-white/40 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={design}
                        alt={`Design ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    
                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const link = document.createElement('a')
                          link.href = design
                          link.download = `design-${index + 1}.jpg`
                          link.click()
                        }}
                        className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
                        title="Download"
                      >
                        💾
                      </button>
                    </div>
                    
                    {/* Design Number */}
                    <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Template Library */}
        <CollapsibleSection
          title="Template Library"
          icon="📚"
          isExpanded={expandedSections.templates}
          onToggle={() => toggleSection('templates')}
        >
          <div className="text-center py-8">
            <div className="text-2xl mb-2">🚀</div>
            <p className="text-white/70 text-sm">Coming soon!</p>
            <p className="text-white/50 text-xs mt-1">Professional templates for every style</p>
          </div>
        </CollapsibleSection>

      </div>
    </div>
  )
}

export default LeftControlPanel
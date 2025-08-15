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

interface DesignElement {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  imageUrl: string
  opacity: number
}

interface RightPropertiesPanelProps {
  // Product & variant props
  selectedProduct: Product | null
  selectedVariant: string
  onVariantChange: (variantId: string) => void
  
  // Design props
  selectedDesign: DesignElement | null
  onDesignUpdate: (updates: Partial<DesignElement>) => void
  
  // Mockup props
  mockupUrl: string | null
  isGeneratingMockup: boolean
  onRegenerateMockup: () => void
  
  // Validation props
  isValidPlacement: boolean
  placementArea: string
  placementFeedback: string
  
  // Export props
  onExportDesign: () => void
  onDownloadMockup: () => void
  onAddToCart: () => void
}

interface CollapsibleSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  badge?: string
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  className = '',
  badge
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
          {badge && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/60"
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

const RightPropertiesPanel: React.FC<RightPropertiesPanelProps> = ({
  selectedProduct,
  selectedVariant,
  onVariantChange,
  selectedDesign,
  onDesignUpdate,
  mockupUrl,
  isGeneratingMockup,
  onRegenerateMockup,
  isValidPlacement,
  placementArea,
  placementFeedback,
  onExportDesign,
  onDownloadMockup,
  onAddToCart
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    properties: true,
    variants: false,
    preview: true,
    export: false
  })

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const currentVariant = selectedProduct?.variants.find(v => v.id === selectedVariant)

  return (
    <div className="h-full w-80 flex flex-col bg-gradient-to-b from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-l border-white/20">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Properties</h2>
            <p className="text-white/70 text-sm">Design & product settings</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Design Properties */}
        {selectedDesign && (
          <CollapsibleSection
            title="Design Properties"
            icon="🎯"
            isExpanded={expandedSections.properties}
            onToggle={() => toggleSection('properties')}
          >
            <div className="space-y-4">
              {/* Position Controls */}
              <div>
                <label className="block text-sm text-white/90 mb-2 font-medium">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/70">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.x)}
                      onChange={(e) => onDesignUpdate({ x: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white/8 border border-white/20 rounded text-white/95 text-sm focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/25 focus:bg-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.y)}
                      onChange={(e) => onDesignUpdate({ y: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white/8 border border-white/20 rounded text-white/95 text-sm focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/25 focus:bg-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Size Controls */}
              <div>
                <label className="block text-sm text-white/90 mb-2 font-medium">Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/70">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.width)}
                      onChange={(e) => onDesignUpdate({ width: Math.max(20, parseFloat(e.target.value) || 20) })}
                      className="w-full px-2 py-1 bg-white/8 border border-white/20 rounded text-white/95 text-sm focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/25 focus:bg-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedDesign.height)}
                      onChange={(e) => onDesignUpdate({ height: Math.max(20, parseFloat(e.target.value) || 20) })}
                      className="w-full px-2 py-1 bg-white/8 border border-white/20 rounded text-white/95 text-sm focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/25 focus:bg-white/10"
                    />
                  </div>
                </div>
                
                {/* Aspect Ratio Lock */}
                <div className="flex items-center gap-2 mt-2">
                  <button className="text-xs text-white/70 hover:text-white/90 flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-purple-400/30 rounded px-1 py-0.5">
                    <span>🔗</span> Lock aspect ratio
                  </button>
                </div>
              </div>

              {/* Rotation Control */}
              <div>
                <label className="block text-sm text-white/90 mb-2 font-medium">Rotation</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedDesign.rotation}
                    onChange={(e) => onDesignUpdate({ rotation: parseFloat(e.target.value) })}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-white/60 w-12 text-right">
                    {Math.round(selectedDesign.rotation)}°
                  </span>
                </div>
                
                {/* Quick rotation buttons */}
                <div className="flex gap-1 mt-2">
                  {[-90, -45, 0, 45, 90].map(angle => (
                    <button
                      key={angle}
                      onClick={() => onDesignUpdate({ rotation: angle })}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-xs text-white/80 transition-colors"
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Control */}
              <div>
                <label className="block text-sm text-white/80 mb-2 font-medium">Opacity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedDesign.opacity}
                    onChange={(e) => onDesignUpdate({ opacity: parseFloat(e.target.value) })}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-white/60 w-12 text-right">
                    {Math.round(selectedDesign.opacity * 100)}%
                  </span>
                </div>
              </div>

              {/* Placement Validation */}
              <div className={`p-3 rounded-lg border ${
                isValidPlacement 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm ${isValidPlacement ? 'text-green-400' : 'text-red-400'}`}>
                    {isValidPlacement ? '✅' : '❌'}
                  </span>
                  <span className="text-xs font-medium text-white/80">
                    {placementArea.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className={`text-xs ${isValidPlacement ? 'text-green-300' : 'text-red-300'}`}>
                  {placementFeedback}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Product Variants */}
        {selectedProduct && (
          <CollapsibleSection
            title="Product Variants"
            icon="🎨"
            isExpanded={expandedSections.variants}
            onToggle={() => toggleSection('variants')}
            badge={selectedProduct.variants.length.toString()}
          >
            <div className="space-y-4">
              {/* Current Selection */}
              {currentVariant && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80 font-medium">Current Selection</span>
                    <span className="text-lg font-bold text-green-400">
                      ${currentVariant.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: currentVariant.color_code }}
                    />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {currentVariant.size} • {currentVariant.color}
                      </p>
                      <p className={`text-xs ${currentVariant.in_stock ? 'text-green-400' : 'text-red-400'}`}>
                        {currentVariant.in_stock ? '✅ In Stock' : '❌ Out of Stock'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* All Variants */}
              <div>
                <label className="block text-sm text-white/80 mb-2 font-medium">Available Options</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedProduct.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => onVariantChange(variant.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${
                        selectedVariant === variant.id
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-white/20"
                            style={{ backgroundColor: variant.color_code }}
                          />
                          <div>
                            <div className="text-sm font-medium text-white">
                              {variant.size} • {variant.color}
                            </div>
                            <div className={`text-xs ${variant.in_stock ? 'text-green-400' : 'text-red-400'}`}>
                              {variant.in_stock ? 'In Stock' : 'Out of Stock'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold text-sm">
                            ${variant.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Mockup Preview */}
        {selectedProduct && (
          <CollapsibleSection
            title="Mockup Preview"
            icon="👀"
            isExpanded={expandedSections.preview}
            onToggle={() => toggleSection('preview')}
          >
            <div className="space-y-4">
              {mockupUrl ? (
                <div className="space-y-3">
                  <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={mockupUrl}
                      alt="Product mockup"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-green-400 text-sm font-medium">Ready to Order</span>
                    </div>
                    <div className="text-green-300 text-xs space-y-1">
                      <p>• High-resolution 4K mockup</p>
                      <p>• Professional placement</p>
                      <p>• Print-ready quality</p>
                    </div>
                  </div>
                </div>
              ) : isGeneratingMockup ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-purple-400 font-medium text-sm">Creating mockup...</span>
                  </div>
                  <div className="w-full bg-purple-500/20 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🎨</div>
                  <p className="text-white/60 text-sm">Generate a design to see preview</p>
                </div>
              )}
              
              {mockupUrl && (
                <button
                  onClick={onRegenerateMockup}
                  disabled={isGeneratingMockup}
                  className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white text-sm transition-colors"
                >
                  🔄 Regenerate Mockup
                </button>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Export & Order */}
        {(selectedDesign || mockupUrl) && (
          <CollapsibleSection
            title="Export & Order"
            icon="🚀"
            isExpanded={expandedSections.export}
            onToggle={() => toggleSection('export')}
          >
            <div className="space-y-3">
              {/* Export Options */}
              <div>
                <label className="block text-sm text-white/80 mb-2 font-medium">Export Options</label>
                <div className="space-y-2">
                  <button
                    onClick={onDownloadMockup}
                    disabled={!mockupUrl}
                    className="w-full py-2 px-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    📥 Download Mockup
                  </button>
                  
                  <button
                    onClick={onExportDesign}
                    disabled={!selectedDesign}
                    className="w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    💾 Export Design
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              {selectedProduct && currentVariant && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-white/80 mb-2 font-medium">Order Summary</div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70 text-sm">{selectedProduct.name.split('|')[0]}</span>
                    <span className="text-green-400 font-semibold">${currentVariant.price.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-white/50 mb-3">
                    {currentVariant.size} • {currentVariant.color} • {selectedProduct.provider_name}
                  </div>
                  
                  <button
                    onClick={onAddToCart}
                    disabled={!isValidPlacement || !mockupUrl}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm transition-all"
                  >
                    🛒 Add to Cart - ${currentVariant.price.toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}

export default RightPropertiesPanel
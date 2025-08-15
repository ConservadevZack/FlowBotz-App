"use client"

import React, { useState, useEffect, useCallback } from 'react'

interface PlacementConstraints {
  area: string
  x_range: [number, number]
  y_range: [number, number]
  max_width: number
  max_height: number
  optimal_x: number
  optimal_y: number
}

interface ProductSpecs {
  type: string
  print_areas: Record<string, PlacementConstraints>
  product_dimensions: {
    width: number
    height: number
  }
}

interface DesignOverlayData {
  x: number
  y: number
  width: number
  height: number
  isValid: boolean
  area: string
}

interface ProductDesignOverlayProps {
  productImage: string
  generatedDesign?: string
  productSpecs?: ProductSpecs
  onDesignChange?: (overlayData: DesignOverlayData) => void
  onValidationChange?: (isValid: boolean, feedback: string) => void
}

export default function ProductDesignOverlay({
  productImage,
  generatedDesign,
  productSpecs,
  onDesignChange,
  onValidationChange
}: ProductDesignOverlayProps) {
  console.log('ProductDesignOverlay render:', { 
    hasProductImage: !!productImage, 
    hasGeneratedDesign: !!generatedDesign, 
    hasProductSpecs: !!productSpecs 
  })
  // Design overlay state
  const [overlayPosition, setOverlayPosition] = useState({ x: 200, y: 150 })
  const [overlaySize, setOverlaySize] = useState({ width: 200, height: 200 })
  const [isValid, setIsValid] = useState(true)
  const [validationFeedback, setValidationFeedback] = useState('')
  const [activeConstraints, setActiveConstraints] = useState<PlacementConstraints | null>(null)

  // Container dimensions for responsive calculation
  const containerWidth = 600
  const containerHeight = 400

  // Convert POD inches to pixel coordinates
  const inchesToPixels = (inches: number) => inches * 20 // 20px per inch scale
  const pixelsToInches = (pixels: number) => pixels / 20

  // Get the current placement area based on overlay position
  const getCurrentPlacementArea = useCallback(() => {
    if (!productSpecs) return null

    const centerX = overlayPosition.x + overlaySize.width / 2
    const centerY = overlayPosition.y + overlaySize.height / 2

    // Convert to inches relative to product center
    const inchesX = pixelsToInches(centerX - containerWidth / 2)
    const inchesY = pixelsToInches(centerY - containerHeight / 2)

    // Find which print area contains this position
    for (const [areaName, constraints] of Object.entries(productSpecs.print_areas)) {
      if (
        inchesX >= constraints.x_range[0] &&
        inchesX <= constraints.x_range[1] &&
        inchesY >= constraints.y_range[0] &&
        inchesY <= constraints.y_range[1]
      ) {
        return { area: areaName, constraints }
      }
    }
    
    return null
  }, [overlayPosition, overlaySize, productSpecs])

  // Real-time validation against POD constraints
  const validatePlacement = useCallback(() => {
    if (!productSpecs) return

    const currentArea = getCurrentPlacementArea()
    
    if (!currentArea) {
      setIsValid(false)
      setValidationFeedback('⚠️ Design is outside printable areas')
      setActiveConstraints(null)
      onValidationChange?.(false, 'Design is outside printable areas')
      return
    }

    const { constraints } = currentArea
    setActiveConstraints(constraints)

    // Check size constraints
    const designWidthInches = pixelsToInches(overlaySize.width)
    const designHeightInches = pixelsToInches(overlaySize.height)

    const issues: string[] = []

    if (designWidthInches > constraints.max_width) {
      issues.push(`Design too wide (${designWidthInches.toFixed(1)}" > ${constraints.max_width}")`)
    }

    if (designHeightInches > constraints.max_height) {
      issues.push(`Design too tall (${designHeightInches.toFixed(1)}" > ${constraints.max_height}")`)
    }

    if (issues.length > 0) {
      setIsValid(false)
      setValidationFeedback(`❌ ${issues.join(', ')}`)
      onValidationChange?.(false, issues.join(', '))
    } else {
      setIsValid(true)
      setValidationFeedback(`✅ Perfect placement in ${currentArea.area.replace('_', ' ')}`)
      onValidationChange?.(true, `Valid placement in ${currentArea.area}`)
    }

    // Notify parent of changes
    onDesignChange?.({
      x: pixelsToInches(overlayPosition.x - containerWidth / 2),
      y: pixelsToInches(overlayPosition.y - containerHeight / 2),
      width: designWidthInches,
      height: designHeightInches,
      isValid: issues.length === 0,
      area: currentArea.area
    })
  }, [overlayPosition, overlaySize, productSpecs, getCurrentPlacementArea, onDesignChange, onValidationChange])

  // Run validation whenever position or size changes
  useEffect(() => {
    validatePlacement()
  }, [validatePlacement])

  // Auto-position design to optimal placement when product changes
  useEffect(() => {
    if (productSpecs && productSpecs.print_areas) {
      const primaryArea = Object.values(productSpecs.print_areas)[0]
      if (primaryArea) {
        const optimalX = containerWidth / 2 + inchesToPixels(primaryArea.optimal_x) - overlaySize.width / 2
        const optimalY = containerHeight / 2 + inchesToPixels(primaryArea.optimal_y) - overlaySize.height / 2
        
        setOverlayPosition({ x: optimalX, y: optimalY })
      }
    }
  }, [productSpecs, overlaySize])

  const handleDragStop = (e: any, data: any) => {
    setOverlayPosition({ x: data.x, y: data.y })
  }

  const handleResizeStop = (e: any, direction: any, ref: any, delta: any, position: any) => {
    setOverlaySize({
      width: ref.offsetWidth,
      height: ref.offsetHeight
    })
    setOverlayPosition(position)
  }

  try {
    return (
      <div className="relative w-full h-full bg-white/5 rounded-xl overflow-hidden">
      {/* Product Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        {productImage ? (
          <img 
            src={productImage}
            alt="Product"
            className="max-w-full max-h-full object-contain opacity-90"
            style={{ maxWidth: containerWidth, maxHeight: containerHeight }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/60">
            <div className="text-center">
              <div className="text-4xl mb-2">👕</div>
              <p className="text-sm">Select a product to see mockup</p>
            </div>
          </div>
        )}
      </div>

      {/* Print Area Guidelines */}
      {productSpecs && (
        <div className="absolute inset-0" style={{ width: containerWidth, height: containerHeight }}>
          {Object.entries(productSpecs.print_areas).map(([areaName, constraints]) => {
            const x = containerWidth / 2 + inchesToPixels(constraints.x_range[0])
            const y = containerHeight / 2 + inchesToPixels(constraints.y_range[0])
            const width = inchesToPixels(constraints.x_range[1] - constraints.x_range[0])
            const height = inchesToPixels(constraints.y_range[1] - constraints.y_range[0])

            return (
              <div
                key={areaName}
                className={`absolute border-2 border-dashed transition-all duration-200 ${
                  activeConstraints?.area === areaName 
                    ? 'border-green-400 bg-green-400/10' 
                    : 'border-white/30 bg-white/5'
                }`}
                style={{
                  left: x,
                  top: y,
                  width,
                  height
                }}
              >
                <div className="absolute -top-6 left-0 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                  {areaName.replace('_', ' ')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Static Design Preview (Simplified for stability) */}
      {generatedDesign && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            top: '20%',
            left: '25%',
            width: '50%',
            height: '60%'
          }}
        >
          <div 
            className="w-full h-full rounded-lg border-2 border-green-500 shadow-lg shadow-green-500/20"
            style={{
              backgroundImage: `url(${generatedDesign})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            {/* Preview indicator */}
            <div className="absolute -top-8 left-0 text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
              Design Preview
            </div>
          </div>
        </div>
      )}

      {/* Validation Feedback */}
      {validationFeedback && (
        <div className="absolute top-4 left-4 right-4">
          <div className={`text-xs px-3 py-2 rounded-lg backdrop-blur-sm ${
            isValid 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {validationFeedback}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!generatedDesign && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="text-xs text-white/60 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            Generate a design to start placing it on the product
          </div>
        </div>
      )}
      </div>
    )
  } catch (error) {
    console.error('ProductDesignOverlay error:', error)
    return (
      <div className="relative w-full h-full bg-white/5 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center text-white/60">
          <div className="text-2xl mb-2">🎨</div>
          <p className="text-sm">Design overlay loading...</p>
        </div>
      </div>
    )
  }
}
"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

interface PlacementConstraints {
  area: string
  x_range: [number, number]
  y_range: [number, number]
  max_width: number
  max_height: number
  optimal_x: number
  optimal_y: number
  priority: number
}

interface ProductSpecs {
  type: string
  print_areas: Record<string, PlacementConstraints>
  product_dimensions: {
    width: number
    height: number
  }
}

interface PlacementData {
  x: number
  y: number
  width: number
  height: number
  isValid: boolean
  area: string
}

interface HighPerformanceProductOverlayProps {
  productImage: string
  generatedDesign?: string
  productSpecs?: ProductSpecs
  onPlacementChange?: (placementData: PlacementData) => void
  interactive?: boolean
}

const HighPerformanceProductOverlay: React.FC<HighPerformanceProductOverlayProps> = ({
  productImage,
  generatedDesign,
  productSpecs,
  onPlacementChange,
  interactive = true
}) => {
  // Performance optimized state
  const [overlayPosition, setOverlayPosition] = useState({ x: 200, y: 150 })
  const [overlaySize, setOverlaySize] = useState({ width: 200, height: 200 })
  const [isValid, setIsValid] = useState(true)
  const [validationFeedback, setValidationFeedback] = useState('')
  const [activeConstraints, setActiveConstraints] = useState<PlacementConstraints | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Refs for performance optimization
  const containerRef = useRef<HTMLDivElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout>()

  // Constants for performance
  const containerWidth = 600
  const containerHeight = 400
  const inchesToPixels = useCallback((inches: number) => inches * 20, [])
  const pixelsToInches = useCallback((pixels: number) => pixels / 20, [])

  // Memoized constraint checking for performance
  const getCurrentPlacementArea = useCallback(() => {
    if (!productSpecs) return null

    const centerX = overlayPosition.x + overlaySize.width / 2
    const centerY = overlayPosition.y + overlaySize.height / 2

    const inchesX = pixelsToInches(centerX - containerWidth / 2)
    const inchesY = pixelsToInches(centerY - containerHeight / 2)

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
  }, [overlayPosition, overlaySize, productSpecs, pixelsToInches])

  // Debounced validation for performance
  const validatePlacement = useCallback(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (!productSpecs) return

      const currentArea = getCurrentPlacementArea()
      
      if (!currentArea) {
        setIsValid(false)
        setValidationFeedback('⚠️ Design is outside printable areas')
        setActiveConstraints(null)
        return
      }

      const { constraints } = currentArea
      setActiveConstraints(constraints)

      const designWidthInches = pixelsToInches(overlaySize.width)
      const designHeightInches = pixelsToInches(overlaySize.height)

      const issues: string[] = []

      if (designWidthInches > constraints.max_width) {
        issues.push(`Width: ${designWidthInches.toFixed(1)}" > ${constraints.max_width}"`)
      }

      if (designHeightInches > constraints.max_height) {
        issues.push(`Height: ${designHeightInches.toFixed(1)}" > ${constraints.max_height}"`)
      }

      const valid = issues.length === 0
      setIsValid(valid)
      setValidationFeedback(
        valid 
          ? `✅ Perfect placement in ${currentArea.area.replace('_', ' ')}`
          : `❌ ${issues.join(', ')}`
      )

      // Notify parent of changes
      onPlacementChange?.({
        x: pixelsToInches(overlayPosition.x - containerWidth / 2),
        y: pixelsToInches(overlayPosition.y - containerHeight / 2),
        width: designWidthInches,
        height: designHeightInches,
        isValid: valid,
        area: currentArea.area
      })
    }, 150) // 150ms debounce for smooth performance
  }, [overlayPosition, overlaySize, productSpecs, getCurrentPlacementArea, onPlacementChange, pixelsToInches])

  // Auto-position design optimally when product changes
  useEffect(() => {
    if (productSpecs && productSpecs.print_areas && !isLoaded) {
      const primaryArea = Object.values(productSpecs.print_areas)[0]
      if (primaryArea) {
        const optimalX = containerWidth / 2 + inchesToPixels(primaryArea.optimal_x) - overlaySize.width / 2
        const optimalY = containerHeight / 2 + inchesToPixels(primaryArea.optimal_y) - overlaySize.height / 2
        
        setOverlayPosition({ x: optimalX, y: optimalY })
        setIsLoaded(true)
      }
    }
  }, [productSpecs, overlaySize, inchesToPixels, isLoaded])

  // Run validation when position or size changes
  useEffect(() => {
    if (isLoaded) {
      validatePlacement()
    }
  }, [validatePlacement, isLoaded])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  // Optimized drag handlers with RAF for smooth performance
  const handleDragStop = useCallback((e: any, data: any) => {
    requestAnimationFrame(() => {
      setOverlayPosition({ x: data.x, y: data.y })
    })
  }, [])

  const handleResizeStop = useCallback((e: any, direction: any, ref: any, delta: any, position: any) => {
    requestAnimationFrame(() => {
      setOverlaySize({
        width: ref.offsetWidth,
        height: ref.offsetHeight
      })
      setOverlayPosition(position)
    })
  }, [])

  // Memoized print area guidelines for performance
  const printAreaGuidelines = useMemo(() => {
    if (!productSpecs) return null

    return Object.entries(productSpecs.print_areas).map(([areaName, constraints]) => {
      const x = containerWidth / 2 + inchesToPixels(constraints.x_range[0])
      const y = containerHeight / 2 + inchesToPixels(constraints.y_range[0])
      const width = inchesToPixels(constraints.x_range[1] - constraints.x_range[0])
      const height = inchesToPixels(constraints.y_range[1] - constraints.y_range[0])

      return (
        <div
          key={areaName}
          className={`absolute border-2 border-dashed transition-all duration-200 pointer-events-none ${
            activeConstraints?.area === areaName 
              ? 'border-green-400 bg-green-400/10' 
              : 'border-white/30 bg-white/5'
          }`}
          style={{
            left: x,
            top: y,
            width,
            height,
            willChange: 'transform, opacity'
          }}
        >
          <div className="absolute -top-6 left-0 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
            {areaName.replace('_', ' ')}
          </div>
        </div>
      )
    })
  }, [productSpecs, activeConstraints, inchesToPixels])

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-white/5 rounded-lg overflow-hidden"
      style={{ minHeight: containerHeight }}
    >
      {/* Product Background - Optimized loading */}
      <div className="absolute inset-0 flex items-center justify-center">
        {productImage ? (
          <img 
            src={productImage}
            alt="Product"
            className="max-w-full max-h-full object-contain opacity-90 transition-opacity duration-300"
            style={{ maxWidth: containerWidth, maxHeight: containerHeight }}
            loading="eager"
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/60">
            <div className="text-center">
              <div className="text-4xl mb-2">👕</div>
              <p className="text-sm">Product loading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Print Area Guidelines - Memoized for performance */}
      {productSpecs && (
        <div 
          className="absolute inset-0" 
          style={{ width: containerWidth, height: containerHeight }}
        >
          {printAreaGuidelines}
        </div>
      )}

      {/* Simplified Design Overlay (Interactive mode disabled for stability) */}
      {generatedDesign && interactive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-48 h-48 rounded-lg border-2 border-green-500 shadow-lg shadow-green-500/20"
            style={{
              backgroundImage: `url(${generatedDesign})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            {/* Interactive mode indicator */}
            <div className="absolute -top-8 left-0 text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
              Interactive Preview
            </div>
          </div>
        </div>
      )}

      {/* Static design preview for non-interactive mode */}
      {generatedDesign && !interactive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-48 h-48 rounded-lg border-2 border-white/30"
            style={{
              backgroundImage: `url(${generatedDesign})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          />
        </div>
      )}

      {/* Validation Feedback - Positioned for visibility */}
      {validationFeedback && interactive && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className={`text-xs px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-200 ${
            isValid 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {validationFeedback}
          </div>
        </div>
      )}

      {/* Instructions for new users */}
      {!generatedDesign && interactive && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="text-xs text-white/60 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            Generate a design to start interactive placement
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(HighPerformanceProductOverlay)
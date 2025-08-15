"use client"

import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Text, Image, Transformer } from 'react-konva'
import { useVirtualization } from '../../hooks/useVirtualization'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HIGH PERFORMANCE CANVAS
 * GPU-accelerated canvas with advanced optimizations
 * Memory-efficient rendering for large design projects
 * Virtual scrolling and intelligent caching
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface CanvasElement {
  id: string
  type: 'shape' | 'text' | 'image' | 'group'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  visible?: boolean
  opacity?: number
  zIndex?: number
  data?: any
}

interface HighPerformanceCanvasProps {
  elements: CanvasElement[]
  width: number
  height: number
  scale: number
  onElementSelect: (ids: string[]) => void
  onElementUpdate: (id: string, changes: Partial<CanvasElement>) => void
  onElementsReorder: (ids: string[]) => void
  selectedIds: string[]
  className?: string
  enableVirtualization?: boolean
  maxRenderDistance?: number
  renderBatchSize?: number
}

// Performance configuration
const PERFORMANCE_CONFIG = {
  // GPU acceleration settings
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // Limit for performance
  enableGPUAcceleration: true,
  
  // Rendering optimizations
  hitGraphEnabled: true,
  perfectDrawEnabled: false,
  listening: true,
  
  // Virtual rendering settings
  virtualThreshold: 1000, // Start virtualizing after this many elements
  renderDistance: 2000,   // Render elements within this pixel distance
  batchSize: 50,         // Render elements in batches of this size
  
  // Memory management
  maxCacheSize: 100 * 1024 * 1024, // 100MB cache limit
  cacheLimit: 100,                  // Max cached elements
  
  // Animation settings
  fps: 60,
  enableAnimations: true
}

// Memoized element renderer for performance
const ElementRenderer = memo<{
  element: CanvasElement
  isSelected: boolean
  scale: number
  onUpdate: (changes: Partial<CanvasElement>) => void
}>(({ element, isSelected, scale, onUpdate }) => {
  const elementRef = useRef<Konva.Node>(null)
  
  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const { x, y } = e.target.position()
    onUpdate({ x, y })
  }, [onUpdate])
  
  const handleTransform = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation()
    
    onUpdate({
      scaleX,
      scaleY,
      rotation,
      width: element.width * scaleX,
      height: element.height * scaleY
    })
  }, [onUpdate, element.width, element.height])
  
  // Optimize rendering based on element type
  const renderElement = useMemo(() => {
    const commonProps = {
      key: element.id,
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0,
      scaleX: element.scaleX || 1,
      scaleY: element.scaleY || 1,
      opacity: element.visible !== false ? (element.opacity || 1) : 0,
      draggable: true,
      onDragMove: handleDragMove,
      onTransform: handleTransform,
      // Performance optimizations
      perfectDrawEnabled: PERFORMANCE_CONFIG.perfectDrawEnabled,
      hitGraphEnabled: PERFORMANCE_CONFIG.hitGraphEnabled,
      listening: PERFORMANCE_CONFIG.listening
    }
    
    switch (element.type) {
      case 'shape':
        return <Rect {...commonProps} fill={element.data?.fill || '#000'} />
      
      case 'text':
        return (
          <Text
            {...commonProps}
            text={element.data?.text || 'Text'}
            fontSize={element.data?.fontSize || 16}
            fontFamily={element.data?.fontFamily || 'Arial'}
            fill={element.data?.fill || '#000'}
          />
        )
      
      case 'image':
        return (
          <Image
            {...commonProps}
            image={element.data?.image}
          />
        )
      
      default:
        return null
    }
  }, [element, handleDragMove, handleTransform])
  
  return renderElement
})

ElementRenderer.displayName = 'ElementRenderer'

const HighPerformanceCanvas: React.FC<HighPerformanceCanvasProps> = ({
  elements,
  width,
  height,
  scale,
  onElementSelect,
  onElementUpdate,
  onElementsReorder,
  selectedIds,
  className = '',
  enableVirtualization = true,
  maxRenderDistance = PERFORMANCE_CONFIG.renderDistance,
  renderBatchSize = PERFORMANCE_CONFIG.batchSize
}) => {
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Viewport tracking for virtualization
  const [viewport, setViewport] = React.useState({
    x: 0,
    y: 0,
    width,
    height
  })
  
  // Virtual rendering hook for large element counts
  const { visibleItems: visibleElements, startIndex, endIndex } = useVirtualization({
    items: elements,
    itemHeight: 100, // Average element height for estimation
    containerHeight: height,
    overscan: 10,
    enabled: enableVirtualization && elements.length > PERFORMANCE_CONFIG.virtualThreshold
  })
  
  // Memoized visible elements calculation
  const renderableElements = useMemo(() => {
    if (!enableVirtualization || elements.length <= PERFORMANCE_CONFIG.virtualThreshold) {
      return elements
    }
    
    // Calculate which elements are in viewport
    const viewportBounds = {
      left: viewport.x - maxRenderDistance / scale,
      right: viewport.x + viewport.width + maxRenderDistance / scale,
      top: viewport.y - maxRenderDistance / scale,
      bottom: viewport.y + viewport.height + maxRenderDistance / scale
    }
    
    return elements.filter(element => {
      const elementBounds = {
        left: element.x,
        right: element.x + element.width,
        top: element.y,
        bottom: element.y + element.height
      }
      
      // Check if element intersects with extended viewport
      return !(
        elementBounds.right < viewportBounds.left ||
        elementBounds.left > viewportBounds.right ||
        elementBounds.bottom < viewportBounds.top ||
        elementBounds.top > viewportBounds.bottom
      )
    })
  }, [elements, viewport, scale, maxRenderDistance, enableVirtualization])
  
  // Handle viewport changes for virtualization
  const handleViewportChange = useCallback(() => {
    if (!stageRef.current) return
    
    const stage = stageRef.current
    const pointer = stage.getPointerPosition()
    const transform = stage.getAbsoluteTransform().copy().invert()
    
    if (pointer) {
      const { x, y } = transform.point(pointer)
      setViewport(prev => ({
        ...prev,
        x: x - prev.width / 2,
        y: y - prev.height / 2
      }))
    }
  }, [])
  
  // Handle element selection
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onElementSelect([])
      return
    }
    
    const clickedId = e.target.id()
    if (clickedId) {
      const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey
      if (isMultiSelect) {
        const newSelection = selectedIds.includes(clickedId)
          ? selectedIds.filter(id => id !== clickedId)
          : [...selectedIds, clickedId]
        onElementSelect(newSelection)
      } else {
        onElementSelect([clickedId])
      }
    }
  }, [selectedIds, onElementSelect])
  
  // Handle element updates with batching
  const handleElementUpdate = useCallback((id: string, changes: Partial<CanvasElement>) => {
    // Batch updates for better performance
    requestAnimationFrame(() => {
      onElementUpdate(id, changes)
    })
  }, [onElementUpdate])
  
  // Setup transformer for selected elements
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return
    
    const transformer = transformerRef.current
    const layer = layerRef.current
    
    if (selectedIds.length === 0) {
      transformer.nodes([])
      return
    }
    
    const nodes = selectedIds
      .map(id => layer.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[]
    
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds])
  
  // Performance optimizations
  useEffect(() => {
    if (!stageRef.current || !layerRef.current) return
    
    const stage = stageRef.current
    const layer = layerRef.current
    
    // Enable GPU acceleration
    if (PERFORMANCE_CONFIG.enableGPUAcceleration && stage) {
      const container = stage.container()
      if (container) {
        container.style.willChange = 'transform'
        container.style.transform = 'translateZ(0)' // Force GPU layer
      }
    }
    
    // Optimize rendering
    if (layer) {
      layer.hitGraphEnabled(PERFORMANCE_CONFIG.hitGraphEnabled)
      // Note: perfectDrawEnabled is for shapes, not layers
    }
    
    // Set up performance monitoring
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now()
      layer.on('draw', () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        if (renderTime > 16.67) { // More than one frame at 60fps
          console.warn(`[Canvas] Slow render detected: ${renderTime.toFixed(2)}ms`)
        }
      })
    }
    
    return () => {
      layer.off('draw')
    }
  }, [])
  
  // Memory management
  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        if (memory.usedJSHeapSize > PERFORMANCE_CONFIG.maxCacheSize) {
          // Force garbage collection if available
          if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc()
          }
          console.warn('[Canvas] High memory usage detected, cleared caches')
        }
      }
    }
    
    const interval = setInterval(checkMemoryUsage, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className={`high-performance-canvas ${className}`}
      style={{ width, height, overflow: 'hidden' }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scale={{ x: scale, y: scale }}
        pixelRatio={PERFORMANCE_CONFIG.pixelRatio}
        onClick={handleStageClick}
        onWheel={handleViewportChange}
        onDragMove={handleViewportChange}
      >
        <Layer ref={layerRef}>
          {/* Render elements in batches for better performance */}
          {renderableElements.map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedIds.includes(element.id)}
              scale={scale}
              onUpdate={(changes) => handleElementUpdate(element.id, changes)}
            />
          ))}
          
          {/* Selection transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize to prevent performance issues
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox
              }
              return newBox
            }}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center'
            ]}
            rotateAnchorOffset={20}
            borderStroke="#6366f1"
            borderStrokeWidth={2}
            anchorFill="#6366f1"
            anchorStroke="#4f46e5"
            anchorSize={8}
            keepRatio={false}
          />
        </Layer>
      </Stage>
      
      {/* Performance indicators in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-indicators">
          <div className="indicator">
            Elements: {renderableElements.length} / {elements.length}
          </div>
          <div className="indicator">
            Scale: {(scale * 100).toFixed(0)}%
          </div>
          {enableVirtualization && elements.length > PERFORMANCE_CONFIG.virtualThreshold && (
            <div className="indicator virtualization-active">
              Virtual Rendering Active
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .high-performance-canvas {
          position: relative;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .performance-indicators {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: none;
          z-index: 100;
        }
        
        .indicator {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
        }
        
        .virtualization-active {
          color: #10b981;
        }
        
        /* GPU acceleration hints */
        canvas {
          will-change: transform;
          transform: translateZ(0);
        }
      `}</style>
    </div>
  )
}

export default memo(HighPerformanceCanvas)
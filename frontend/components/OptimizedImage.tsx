"use client"

import { useState, useCallback, memo } from 'react'
import { useInView } from 'react-intersection-observer'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(priority)

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: priority || shouldLoad
  })

  // Trigger loading when in view
  if (inView && !shouldLoad && !priority) {
    setShouldLoad(true)
  }

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse rounded-lg" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-red-500/10 rounded-lg flex items-center justify-center">
          <div className="text-red-400 text-sm">Failed to load</div>
        </div>
      )}

      {/* Actual image - only load when in view or priority */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => 
  prevProps.src === nextProps.src &&
  prevProps.alt === nextProps.alt &&
  prevProps.className === nextProps.className &&
  prevProps.priority === nextProps.priority
)

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
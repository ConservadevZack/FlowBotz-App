"use client"

import React, { useState, useRef, useEffect, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onLoad' | 'onError'> {
  src: string
  alt: string
  aspectRatio?: 'square' | 'video' | 'photo' | 'portrait' | 'golden' | 'auto'
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down'
  priority?: boolean
  loading?: 'lazy' | 'eager'
  quality?: number
  sizes?: string
  placeholder?: 'blur' | 'empty' | string
  blurDataURL?: string
  onLoad?: () => void
  onError?: (error: any) => void
  showLoadingState?: boolean
  showErrorState?: boolean
  errorFallback?: React.ReactNode
  loadingFallback?: React.ReactNode
  className?: string
}

export const OptimizedImageComponent: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  aspectRatio = 'auto',
  fit = 'cover',
  priority = false,
  loading = 'lazy',
  quality = 75,
  sizes,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  showLoadingState = true,
  showErrorState = true,
  errorFallback,
  loadingFallback,
  className,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('')
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate optimized image URL based on quality and sizes
  const getOptimizedSrc = (originalSrc: string, width?: number) => {
    // If it's already an optimized URL or external URL, return as is
    if (originalSrc.includes('?') || originalSrc.startsWith('http')) {
      return originalSrc
    }

    // Add optimization parameters for internal images
    const params = new URLSearchParams()
    if (quality !== 75) params.set('q', quality.toString())
    if (width) params.set('w', width.toString())
    
    const queryString = params.toString()
    return queryString ? `${originalSrc}?${queryString}` : originalSrc
  }

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }

  // Handle image error
  const handleError = (error: any) => {
    setIsLoading(false)
    setHasError(true)
    onError?.(error)
  }

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!priority && loading === 'lazy' && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !imageSrc) {
              setImageSrc(getOptimizedSrc(src))
              observer.unobserve(entry.target)
            }
          })
        },
        {
          rootMargin: '50px', // Start loading 50px before image comes into view
        }
      )

      observer.observe(containerRef.current)
      return () => observer.disconnect()
    } else {
      // Load immediately for priority images
      setImageSrc(getOptimizedSrc(src))
    }
  }, [src, priority, loading, imageSrc])

  // Responsive image source set
  const generateSrcSet = () => {
    if (!sizes) return undefined

    const breakpoints = [320, 640, 768, 1024, 1280, 1536, 1920]
    return breakpoints
      .map((width) => `${getOptimizedSrc(src, width)} ${width}w`)
      .join(', ')
  }

  // Get aspect ratio classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square'
      case 'video': return 'aspect-video'
      case 'photo': return 'aspect-photo'
      case 'portrait': return 'aspect-portrait'
      case 'golden': return 'aspect-golden'
      default: return ''
    }
  }

  // Get object fit class
  const getObjectFitClass = () => {
    switch (fit) {
      case 'cover': return 'object-cover'
      case 'contain': return 'object-contain'
      case 'fill': return 'object-fill'
      case 'scale-down': return 'object-scale-down'
      default: return 'object-cover'
    }
  }

  // Default loading component
  const defaultLoadingFallback = (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-3 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent opacity-60 mx-auto" />
        <p className="text-fluid-sm text-white/60">Loading image...</p>
      </div>
    </div>
  )

  // Default error component  
  const defaultErrorFallback = (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-3 text-center p-4">
        <div className="text-fluid-2xl text-white/40">📷</div>
        <div className="space-y-1">
          <p className="text-fluid-sm text-white/60 font-medium">Failed to load image</p>
          <p className="text-fluid-xs text-white/40">Please check the image source</p>
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/5",
        getAspectRatioClass(),
        "image-optimized-container",
        className
      )}
      {...props}
    >
      {/* Placeholder blur background */}
      {placeholder === 'blur' && blurDataURL && (
        <div
          className="absolute inset-0 blur-sm scale-105"
          style={{
            backgroundImage: `url(${blurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isLoading ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}

      {/* Loading state */}
      {isLoading && showLoadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm">
          {loadingFallback || defaultLoadingFallback}
        </div>
      )}

      {/* Error state */}
      {hasError && showErrorState && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm">
          {errorFallback || defaultErrorFallback}
        </div>
      )}

      {/* Main image */}
      {imageSrc && !hasError && (
        <img
          ref={imageRef}
          src={imageSrc}
          alt={alt}
          loading={priority ? 'eager' : loading}
          decoding="async"
          srcSet={generateSrcSet()}
          sizes={sizes}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            getObjectFitClass(),
            "will-change-transform backface-visibility-hidden",
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            imageRendering: 'high-quality',
          }}
        />
      )}

      {/* Optional overlay for hover effects */}
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 pointer-events-none" />
    </div>
  )
}

// Higher order component for common image patterns
export const ProductImage = (props: Omit<OptimizedImageProps, 'aspectRatio' | 'fit'>) => (
  <OptimizedImageComponent
    {...props}
    aspectRatio="square"
    fit="cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
)

export const HeroImage = (props: Omit<OptimizedImageProps, 'aspectRatio' | 'priority'>) => (
  <OptimizedImageComponent
    {...props}
    aspectRatio="video" 
    priority={true}
    sizes="100vw"
  />
)

export const GalleryImage = (props: Omit<OptimizedImageProps, 'aspectRatio' | 'loading'>) => (
  <OptimizedImageComponent
    {...props}
    aspectRatio="square"
    loading="lazy"
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  />
)

export const AvatarImage = (props: Omit<OptimizedImageProps, 'aspectRatio' | 'fit' | 'className'>) => (
  <OptimizedImageComponent
    {...props}
    aspectRatio="square"
    fit="cover"
    className={cn("rounded-full", props.className)}
  />
)

// Re-export the main component with a shorter name
export const Image = OptimizedImageComponent

export default OptimizedImageComponent
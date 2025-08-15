"use client"

import React, { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADVANCED IMAGE OPTIMIZER
 * WebP/AVIF support with progressive loading
 * Lazy loading with intersection observer
 * Memory-efficient image management
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  className?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition?: string
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean
  progressive?: boolean
  formats?: ('webp' | 'avif' | 'jpeg' | 'png')[]
}

// Image format detection and optimization
const getOptimizedImageUrl = (src: string, format: string, quality: number = 85): string => {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  // If using external image service, add format and quality parameters
  if (src.includes('unsplash.com') || src.includes('cdn.')) {
    const separator = src.includes('?') ? '&' : '?'
    return `${src}${separator}auto=format&fit=crop&q=${quality}&fm=${format}`
  }

  return src
}

// Progressive loading sizes
const getProgressiveImageSizes = (width: number, height: number) => {
  const baseWidth = Math.min(width, 1200)
  const baseHeight = Math.min(height, 1200)
  
  return [
    { width: Math.floor(baseWidth * 0.1), height: Math.floor(baseHeight * 0.1), quality: 20 },
    { width: Math.floor(baseWidth * 0.3), height: Math.floor(baseHeight * 0.3), quality: 40 },
    { width: Math.floor(baseWidth * 0.7), height: Math.floor(baseHeight * 0.7), quality: 70 },
    { width: baseWidth, height: baseHeight, quality: 85 }
  ]
}

// Blur data URL generator
const generateBlurDataURL = (width: number = 10, height: number = 10): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Create a simple gradient blur
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  width = 800,
  height = 600,
  priority = false,
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  className = '',
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  lazy = true,
  progressive = true,
  formats = ['avif', 'webp', 'jpeg']
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  const [ref, inView, entry] = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true,
    skip: priority || !lazy
  })

  // Generate blur placeholder if not provided
  const fallbackBlurDataURL = blurDataURL || generateBlurDataURL(width, height)

  // Progressive loading implementation
  const loadProgressively = useCallback(async () => {
    if (!progressive || hasError) return

    const sizes = getProgressiveImageSizes(width, height)
    let bestFormat = 'jpeg'

    // Detect best supported format
    for (const format of formats) {
      if (format === 'avif' && CSS.supports('background-image: url(data:image/avif;base64,)')) {
        bestFormat = 'avif'
        break
      } else if (format === 'webp' && CSS.supports('background-image: url(data:image/webp;base64,)')) {
        bestFormat = 'webp'
        break
      }
    }

    try {
      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i]
        const optimizedUrl = getOptimizedImageUrl(src, bestFormat, size.quality)
        
        await new Promise<void>((resolve, reject) => {
          const img = new window.Image()
          img.onload = () => {
            setCurrentSrc(optimizedUrl)
            setLoadingProgress((i + 1) / sizes.length * 100)
            resolve()
          }
          img.onerror = reject
          img.src = optimizedUrl
        })

        // Small delay for smooth progression
        if (i < sizes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      setIsLoaded(true)
      onLoad?.()
    } catch (error) {
      console.warn('Progressive loading failed:', error)
      setHasError(true)
      onError?.()
    }
  }, [src, width, height, formats, progressive, hasError, onLoad, onError])

  // Load image when in view or priority
  useEffect(() => {
    if ((inView || priority) && !hasError && !isLoaded) {
      if (progressive) {
        loadProgressively()
      } else {
        const bestFormat = formats[0] || 'jpeg'
        const optimizedUrl = getOptimizedImageUrl(src, bestFormat, quality)
        setCurrentSrc(optimizedUrl)
        setIsLoaded(true)
      }
    }
  }, [inView, priority, loadProgressively, progressive, src, formats, quality, hasError, isLoaded])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Error fallback
  if (hasError) {
    return (
      <div 
        ref={ref}
        className={`optimized-image-error ${className}`}
        style={{ width, height }}
      >
        <div className="error-content">
          <span className="error-icon">📷</span>
          <span className="error-text">Image unavailable</span>
        </div>
        
        <style jsx>{`
          .optimized-image-error {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.1);
            border: 1px dashed rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            backdrop-filter: blur(4px);
          }
          
          .error-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.6);
          }
          
          .error-icon {
            font-size: 24px;
            opacity: 0.5;
          }
          
          .error-text {
            font-size: 12px;
            font-weight: 500;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div ref={ref} className={`optimized-image-container ${className}`}>
      {currentSrc && (
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={fallbackBlurDataURL}
          className={`optimized-image ${isLoaded ? 'loaded' : 'loading'}`}
          style={{
            objectFit,
            objectPosition,
            transition: 'opacity 0.3s ease, filter 0.3s ease'
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Progressive loading indicator */}
      {progressive && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="loading-progress">
          <div 
            className="progress-bar"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      <style jsx>{`
        .optimized-image-container {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
        }
        
        .optimized-image {
          transition: opacity 0.3s ease, filter 0.3s ease;
        }
        
        .optimized-image.loading {
          opacity: 0.8;
          filter: blur(2px);
        }
        
        .optimized-image.loaded {
          opacity: 1;
          filter: none;
        }
        
        .loading-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          transition: width 0.3s ease;
          border-radius: 1px;
        }
      `}</style>
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

// Image preloader utility
export const preloadImage = (src: string, format: string = 'webp'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = getOptimizedImageUrl(src, format)
  })
}

// Batch image preloader
export const preloadImages = async (srcs: string[], format: string = 'webp'): Promise<void> => {
  try {
    await Promise.all(srcs.map(src => preloadImage(src, format)))
  } catch (error) {
    console.warn('Failed to preload some images:', error)
  }
}

export default OptimizedImage
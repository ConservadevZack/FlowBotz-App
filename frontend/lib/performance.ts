// Performance optimization utilities for AI generation and general app performance

import { useCallback, useRef, useEffect } from 'react'

// Image optimization and caching
export class ImageCache {
  private static cache = new Map<string, string>()
  private static maxSize = 50 // Maximum number of cached images
  
  static set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
  
  static get(key: string): string | undefined {
    return this.cache.get(key)
  }
  
  static has(key: string): boolean {
    return this.cache.has(key)
  }
  
  static clear(): void {
    this.cache.clear()
  }
}

// Debounce hook for performance optimization
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

// Throttle hook for performance optimization
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastRun = useRef<number>(Date.now())
  
  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args)
          lastRun.current = Date.now()
        }, delay - (Date.now() - lastRun.current))
      }
    }) as T,
    [callback, delay]
  )
}

// AI Generation Performance Optimizer
export class AIPerformanceOptimizer {
  private static promptCache = new Map<string, { result: string; timestamp: number }>()
  private static cacheExpiry = 30 * 60 * 1000 // 30 minutes
  
  // Cache AI generation results to avoid duplicate requests
  static getCachedResult(prompt: string, model: string): string | null {
    const key = `${prompt}:${model}`
    const cached = this.promptCache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result
    }
    
    if (cached) {
      this.promptCache.delete(key) // Remove expired cache
    }
    
    return null
  }
  
  static setCachedResult(prompt: string, model: string, result: string): void {
    const key = `${prompt}:${model}`
    this.promptCache.set(key, {
      result,
      timestamp: Date.now()
    })
    
    // Cleanup old entries if cache gets too large
    if (this.promptCache.size > 100) {
      const entries = Array.from(this.promptCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.promptCache.delete(entries[i][0])
      }
    }
  }
  
  // Optimize prompt for faster generation
  static optimizePromptForSpeed(prompt: string): string {
    // Remove redundant words
    const redundantWords = ['very', 'extremely', 'highly', 'super', 'ultra']
    let optimized = prompt
    
    redundantWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\s+`, 'gi')
      optimized = optimized.replace(regex, '')
    })
    
    // Limit prompt length for faster processing
    const words = optimized.split(' ')
    if (words.length > 50) {
      optimized = words.slice(0, 50).join(' ')
    }
    
    return optimized.trim()
  }
  
  // Estimate generation time based on prompt complexity
  static estimateGenerationTime(prompt: string, model: string): number {
    const baseTime = model === 'dall-e-3' ? 15000 : 8000 // Base time in ms
    const wordCount = prompt.split(' ').length
    const complexityMultiplier = Math.min(1 + (wordCount / 20), 2) // Max 2x multiplier
    
    // Add randomness for realism (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4
    
    return Math.round(baseTime * complexityMultiplier * randomFactor)
  }
  
  // Select optimal model based on requirements
  static selectOptimalModel(prompt: string, quality: 'fast' | 'balanced' | 'quality'): string {
    const wordCount = prompt.split(' ').length
    const hasComplexRequirements = /detailed|intricate|professional|high.quality|photorealistic/.test(prompt.toLowerCase())
    
    if (quality === 'fast') {
      return 'stable-diffusion'
    }
    
    if (quality === 'quality') {
      return 'dall-e-3'
    }
    
    // Balanced selection
    if (wordCount < 10 && !hasComplexRequirements) {
      return 'stable-diffusion'
    }
    
    return 'dall-e-3'
  }
}

// Memory management for large datasets
export class MemoryOptimizer {
  private static observers = new Map<string, IntersectionObserver>()
  
  // Lazy loading for images
  static createLazyLoader(callback: (entry: IntersectionObserverEntry) => void): IntersectionObserver {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach(callback)
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    )
  }
  
  // Virtual scrolling helper
  static calculateVisibleItems(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number,
    overscan = 5
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const visibleItems = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2)
    
    return { startIndex, endIndex, visibleItems }
  }
}

// Network optimization for API requests
export class NetworkOptimizer {
  private static requestQueue: Array<{
    id: string
    request: () => Promise<any>
    priority: number
    timestamp: number
  }> = []
  
  private static isProcessing = false
  private static maxConcurrent = 3
  private static activeRequests = 0
  
  // Queue requests with priority
  static queueRequest(
    id: string,
    request: () => Promise<any>,
    priority: number = 0
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id,
        request: async () => {
          try {
            const result = await request()
            resolve(result)
            return result
          } catch (error) {
            reject(error)
            throw error
          }
        },
        priority,
        timestamp: Date.now()
      })
      
      this.processQueue()
    })
  }
  
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrent) {
      return
    }
    
    this.isProcessing = true
    
    // Sort by priority (higher first) and timestamp (older first)
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.timestamp - b.timestamp
    })
    
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.requestQueue.shift()
      if (item) {
        this.activeRequests++
        
        item.request().finally(() => {
          this.activeRequests--
          this.processQueue()
        })
      }
    }
    
    this.isProcessing = false
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, number[]> = {}
  
  static startTimer(label: string): () => number {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)
      return duration
    }
  }
  
  static recordMetric(label: string, value: number): void {
    if (!this.metrics[label]) {
      this.metrics[label] = []
    }
    
    this.metrics[label].push(value)
    
    // Keep only last 100 measurements
    if (this.metrics[label].length > 100) {
      this.metrics[label] = this.metrics[label].slice(-100)
    }
  }
  
  static getMetrics(label: string): {
    avg: number
    min: number
    max: number
    count: number
  } | null {
    const values = this.metrics[label]
    if (!values || values.length === 0) {
      return null
    }
    
    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }
  
  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    Object.keys(this.metrics).forEach(label => {
      result[label] = this.getMetrics(label)
    })
    
    return result
  }
}

// React hook for performance monitoring
export const usePerformanceTimer = (label: string) => {
  const timerRef = useRef<(() => number) | null>(null)
  
  const start = useCallback(() => {
    timerRef.current = PerformanceMonitor.startTimer(label)
  }, [label])
  
  const stop = useCallback(() => {
    if (timerRef.current) {
      const duration = timerRef.current()
      timerRef.current = null
      return duration
    }
    return 0
  }, [])
  
  return { start, stop }
}

// Image preloader utility
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

// Batch image preloader
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url))
  await Promise.allSettled(promises)
}

// Resource cleanup utility
export const useCleanup = (cleanup: () => void) => {
  useEffect(() => {
    return cleanup
  }, [cleanup])
}

// Adaptive quality settings based on device performance
export const getAdaptiveQuality = (): 'fast' | 'balanced' | 'quality' => {
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory
  
  // Check connection speed
  const connection = (navigator as any).connection
  const effectiveType = connection?.effectiveType
  
  // Check if device is mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Low-end device detection
  if (memory && memory <= 4) return 'fast'
  if (isMobile && effectiveType === '2g') return 'fast'
  if (effectiveType === '3g') return 'balanced'
  
  // High-end device with good connection
  if (memory && memory >= 8 && effectiveType === '4g') return 'quality'
  
  return 'balanced'
}
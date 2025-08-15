"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INTERSECTION OBSERVER HOOK
 * Performance-optimized viewport detection
 * Memory efficient with proper cleanup
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface UseIntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  triggerOnce?: boolean
  skip?: boolean
  delay?: number
}

type UseIntersectionObserverResult<T extends Element> = [
  (node: T | null) => void,
  boolean,
  IntersectionObserverEntry | undefined
]

export function useIntersectionObserver<T extends Element = HTMLDivElement>({
  root = null,
  rootMargin = '0px',
  threshold = 0.1,
  triggerOnce = false,
  skip = false,
  delay = 0
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult<T> {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const [inView, setInView] = useState(false)
  const nodeRef = useRef<T | null>(null)
  const observerRef = useRef<IntersectionObserver>()
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const setRef = useCallback((node: T | null) => {
    nodeRef.current = node
  }, [])

  useEffect(() => {
    const node = nodeRef.current
    
    if (skip || !node) return

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setEntry(entry)
        
        const isIntersecting = entry.isIntersecting
        
        if (delay > 0) {
          if (isIntersecting) {
            timeoutRef.current = setTimeout(() => {
              setInView(true)
            }, delay)
          } else {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            if (!triggerOnce) {
              setInView(false)
            }
          }
        } else {
          setInView(isIntersecting)
        }
        
        // Disconnect if triggerOnce and element is in view
        if (triggerOnce && isIntersecting) {
          observer.disconnect()
          observerRef.current = undefined
        }
      },
      {
        root,
        rootMargin,
        threshold
      }
    )

    observer.observe(node)
    observerRef.current = observer

    return () => {
      observer.disconnect()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [root, rootMargin, threshold, triggerOnce, skip, delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [setRef, inView, entry]
}

// Specialized hooks for common use cases

export function useLazyLoading<T extends Element = HTMLDivElement>(
  options: Omit<UseIntersectionObserverOptions, 'triggerOnce'> = {}
) {
  return useIntersectionObserver<T>({
    ...options,
    triggerOnce: true,
    rootMargin: '50px'
  })
}

export function useViewportTracking<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
) {
  return useIntersectionObserver<T>({
    ...options,
    triggerOnce: false
  })
}

export function useScrollAnimation<T extends Element = HTMLDivElement>(
  options: Omit<UseIntersectionObserverOptions, 'threshold'> = {}
) {
  return useIntersectionObserver<T>({
    ...options,
    threshold: [0, 0.25, 0.5, 0.75, 1]
  })
}

export default useIntersectionObserver
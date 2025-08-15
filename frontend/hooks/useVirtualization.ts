"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VIRTUALIZATION HOOK
 * Efficient virtual scrolling for large datasets
 * Memory optimization with visible item calculation
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface UseVirtualizationOptions<T> {
  items: T[]
  itemHeight: number | ((index: number, item: T) => number)
  containerHeight: number
  overscan?: number
  scrollOffset?: number
  enabled?: boolean
  estimateSize?: (index: number) => number
}

interface UseVirtualizationResult<T> {
  visibleItems: T[]
  startIndex: number
  endIndex: number
  totalHeight: number
  offsetY: number
  scrollTo: (index: number) => void
  scrollToOffset: (offset: number) => void
}

export function useVirtualization<T = any>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  scrollOffset = 0,
  enabled = true,
  estimateSize
}: UseVirtualizationOptions<T>): UseVirtualizationResult<T> {
  const [scrollTop, setScrollTop] = useState(scrollOffset)
  
  // Calculate item heights and positions
  const itemMetadata = useMemo(() => {
    const metadata: Array<{ height: number; offset: number }> = []
    let currentOffset = 0
    
    for (let i = 0; i < items.length; i++) {
      const height = typeof itemHeight === 'function' 
        ? itemHeight(i, items[i])
        : itemHeight
      
      metadata.push({
        height,
        offset: currentOffset
      })
      
      currentOffset += height
    }
    
    return metadata
  }, [items, itemHeight])
  
  // Calculate total height
  const totalHeight = useMemo(() => {
    if (!enabled || items.length === 0) return 0
    return itemMetadata[itemMetadata.length - 1]?.offset + itemMetadata[itemMetadata.length - 1]?.height || 0
  }, [itemMetadata, items.length, enabled])
  
  // Binary search to find start index
  const findStartIndex = useCallback((scrollTop: number) => {
    let low = 0
    let high = itemMetadata.length - 1
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const { offset, height } = itemMetadata[mid]
      
      if (offset <= scrollTop && scrollTop < offset + height) {
        return mid
      } else if (offset < scrollTop) {
        low = mid + 1
      } else {
        high = mid - 1
      }
    }
    
    return Math.max(0, Math.min(low, itemMetadata.length - 1))
  }, [itemMetadata])
  
  // Find end index
  const findEndIndex = useCallback((startIndex: number, containerHeight: number) => {
    const startOffset = itemMetadata[startIndex]?.offset || 0
    const targetOffset = startOffset + containerHeight
    
    let endIndex = startIndex
    
    while (
      endIndex < itemMetadata.length - 1 &&
      itemMetadata[endIndex].offset < targetOffset
    ) {
      endIndex++
    }
    
    return endIndex
  }, [itemMetadata])
  
  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    if (!enabled) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        offsetY: 0
      }
    }
    
    if (items.length === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        offsetY: 0
      }
    }
    
    const startIndex = Math.max(0, findStartIndex(scrollTop) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      findEndIndex(startIndex, containerHeight) + overscan
    )
    
    const offsetY = itemMetadata[startIndex]?.offset || 0
    
    return {
      startIndex,
      endIndex,
      offsetY
    }
  }, [
    enabled,
    items.length,
    scrollTop,
    containerHeight,
    overscan,
    findStartIndex,
    findEndIndex,
    itemMetadata
  ])
  
  // Extract visible items
  const visibleItems = useMemo(() => {
    if (!enabled) return items
    
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange.startIndex, visibleRange.endIndex, enabled])
  
  // Scroll to specific index
  const scrollTo = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return
    
    const targetOffset = itemMetadata[index]?.offset || 0
    setScrollTop(targetOffset)
  }, [items.length, itemMetadata])
  
  // Scroll to specific offset
  const scrollToOffset = useCallback((offset: number) => {
    const clampedOffset = Math.max(0, Math.min(offset, totalHeight - containerHeight))
    setScrollTop(clampedOffset)
  }, [totalHeight, containerHeight])
  
  return {
    visibleItems,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    totalHeight,
    offsetY: visibleRange.offsetY,
    scrollTo,
    scrollToOffset
  }
}

// Specialized hooks for common use cases

export function useVirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  columns,
  gap = 0,
  enabled = true
}: {
  items: T[]
  itemWidth: number
  itemHeight: number
  containerWidth: number
  containerHeight: number
  columns: number
  gap?: number
  enabled?: boolean
}) {
  const rowHeight = itemHeight + gap
  const rows = Math.ceil(items.length / columns)
  
  const virtualization = useVirtualization({
    items: Array.from({ length: rows }, (_, rowIndex) => 
      items.slice(rowIndex * columns, (rowIndex + 1) * columns)
    ),
    itemHeight: rowHeight,
    containerHeight,
    enabled
  })
  
  const visibleItems = virtualization.visibleItems.flat()
  const startIndex = virtualization.startIndex * columns
  const endIndex = Math.min((virtualization.endIndex + 1) * columns - 1, items.length - 1)
  
  return {
    ...virtualization,
    visibleItems,
    startIndex,
    endIndex,
    rowHeight,
    totalRows: rows
  }
}

// List virtualization with dynamic heights
export function useDynamicVirtualization<T>({
  items,
  estimateSize,
  containerHeight,
  overscan = 5,
  enabled = true
}: {
  items: T[]
  estimateSize: (index: number) => number
  containerHeight: number
  overscan?: number
  enabled?: boolean
}) {
  const [measuredSizes, setMeasuredSizes] = useState<Map<number, number>>(new Map())
  
  const getItemSize = useCallback((index: number) => {
    return measuredSizes.get(index) || estimateSize(index)
  }, [measuredSizes, estimateSize])
  
  const measureItem = useCallback((index: number, size: number) => {
    setMeasuredSizes(prev => {
      const newSizes = new Map(prev)
      newSizes.set(index, size)
      return newSizes
    })
  }, [])
  
  const virtualization = useVirtualization({
    items,
    itemHeight: getItemSize,
    containerHeight,
    overscan,
    enabled
  })
  
  return {
    ...virtualization,
    measureItem,
    measuredSizes
  }
}

export default useVirtualization
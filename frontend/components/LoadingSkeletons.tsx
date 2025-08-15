"use client"

import { memo } from 'react'

// Product grid skeleton
export const ProductGridSkeleton = memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-96 overflow-y-auto cosmic-stagger">
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className="cosmic-card-premium p-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg cosmic-skeleton-advanced flex-shrink-0"></div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 cosmic-skeleton-advanced mb-2"></div>
            <div className="h-3 cosmic-skeleton-advanced w-3/4 mb-1"></div>
            <div className="h-3 cosmic-skeleton-advanced w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
))

ProductGridSkeleton.displayName = 'ProductGridSkeleton'

// Categories skeleton
export const CategoriesSkeleton = memo(() => (
  <div className="space-y-3 cosmic-stagger">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="cosmic-card-premium p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 cosmic-skeleton-advanced rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 cosmic-skeleton-advanced mb-2"></div>
            <div className="h-3 cosmic-skeleton-advanced w-2/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
))

CategoriesSkeleton.displayName = 'CategoriesSkeleton'

// Design history skeleton
export const DesignHistorySkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 cosmic-stagger">
    {Array.from({ length: 4 }, (_, i) => (
      <div 
        key={i} 
        className="aspect-square cosmic-skeleton-advanced rounded-xl"
      ></div>
    ))}
  </div>
))

DesignHistorySkeleton.displayName = 'DesignHistorySkeleton'

// Variants skeleton
export const VariantsSkeleton = memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-64 overflow-y-auto cosmic-stagger">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="cosmic-card-premium p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg cosmic-skeleton-advanced"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 cosmic-skeleton-advanced mb-2"></div>
            <div className="h-3 cosmic-skeleton-advanced w-1/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
))

VariantsSkeleton.displayName = 'VariantsSkeleton'

// Main content skeleton for initial load
export const CreatorStudioSkeleton = memo(() => (
  <div className="min-h-screen pt-24 pb-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-12 bg-gradient-to-r from-white/20 to-white/5 rounded-lg animate-pulse mb-4 w-1/3"></div>
        <div className="h-6 bg-white/10 rounded animate-pulse w-2/3"></div>
      </div>

      {/* Progress skeleton */}
      <div className="cosmic-card-premium mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-6 cosmic-skeleton-advanced w-32"></div>
          <div className="flex gap-2 sm:gap-4 cosmic-stagger">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg cosmic-glass">
                <div className="w-8 h-8 rounded-full cosmic-skeleton-advanced"></div>
                <div className="w-16 h-4 cosmic-skeleton-advanced"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left panel skeleton */}
        <div className="lg:col-span-1 space-y-4 lg:space-y-6">
          <div className="cosmic-card-premium">
            <div className="h-6 cosmic-skeleton-advanced mb-6 w-1/2"></div>
            <div className="space-y-4">
              <ProductGridSkeleton />
            </div>
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="lg:col-span-2">
          <div className="cosmic-card-premium h-[400px] sm:h-[500px] lg:h-[600px]">
            <div className="h-full cosmic-skeleton-advanced rounded-xl flex items-center justify-center">
              <div className="text-center cosmic-animate-fade-in">
                <div className="cosmic-loading-advanced mb-4">
                  <div className="cosmic-loading-dot w-4 h-4 bg-purple-400"></div>
                  <div className="cosmic-loading-dot w-4 h-4 bg-blue-400"></div>
                  <div className="cosmic-loading-dot w-4 h-4 bg-pink-400"></div>
                </div>
                <div className="text-white/60 font-medium cosmic-animate-text-reveal">Loading Creator Studio...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
))

CreatorStudioSkeleton.displayName = 'CreatorStudioSkeleton'

// Advanced Loading Dots Component
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export const LoadingDots = memo(({ size = 'md', color = 'currentColor', className = '' }: LoadingDotsProps) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2', 
    lg: 'w-3 h-3'
  }

  return (
    <div className={`cosmic-loading-advanced ${className}`}>
      <div 
        className={`cosmic-loading-dot ${sizeClasses[size]}`}
        style={{ backgroundColor: color }}
      />
      <div 
        className={`cosmic-loading-dot ${sizeClasses[size]}`}
        style={{ backgroundColor: color }}
      />
      <div 
        className={`cosmic-loading-dot ${sizeClasses[size]}`}
        style={{ backgroundColor: color }}
      />
    </div>
  )
})

LoadingDots.displayName = 'LoadingDots'

// Advanced Progress Bar Component
interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
  animated?: boolean
}

export const ProgressBar = memo(({ 
  value, 
  max = 100, 
  className = '',
  showLabel = false,
  variant = 'default',
  animated = true
}: ProgressBarProps) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-500 to-pink-500',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    error: 'bg-gradient-to-r from-red-500 to-pink-500'
  }

  return (
    <div className={`relative ${className}`}>
      <div className="cosmic-progress h-3 mb-2">
        <div 
          className={`cosmic-progress-bar ${variantClasses[variant]} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-sm text-white/70">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

// Premium Status Indicator Component
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading'
  children: React.ReactNode
  className?: string
  showIcon?: boolean
}

export const StatusIndicator = memo(({ 
  status, 
  children, 
  className = '',
  showIcon = true 
}: StatusIndicatorProps) => {
  const statusConfig = {
    success: { 
      className: 'cosmic-status-success', 
      icon: '✓'
    },
    warning: { 
      className: 'cosmic-status-warning', 
      icon: '⚠'
    },
    error: { 
      className: 'cosmic-status-error', 
      icon: '✕'
    },
    info: { 
      className: 'cosmic-status-info', 
      icon: 'ℹ'
    },
    loading: { 
      className: 'cosmic-status-info', 
      icon: null
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`cosmic-status-indicator ${config.className} ${className}`}>
      {showIcon && (
        <>
          {status === 'loading' ? (
            <LoadingDots size="sm" />
          ) : (
            <span>{config.icon}</span>
          )}
        </>
      )}
      <span>{children}</span>
    </div>
  )
})

StatusIndicator.displayName = 'StatusIndicator'
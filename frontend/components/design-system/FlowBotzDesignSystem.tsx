"use client"

import React, { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPOGRAPHY COMPONENTS
// ============================================================================

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  gradient?: boolean
  className?: string
}

export const Display = ({ children, gradient, className, ...props }: TypographyProps) => (
  <h1 
    className={cn(
      "text-display-large font-bold tracking-tight",
      gradient && "cosmic-text-gradient",
      className
    )} 
    {...props}
  >
    {children}
  </h1>
)

export const Heading = ({ children, gradient, className, ...props }: TypographyProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) => {
  const { level = 2, ...rest } = props as any
  const Component = `h${level}` as keyof JSX.IntrinsicElements
  
  return (
    <Component
      className={cn(
        level === 1 && "text-fluid-3xl font-bold",
        level === 2 && "text-fluid-2xl font-semibold",
        level === 3 && "text-fluid-xl font-semibold",
        level === 4 && "text-fluid-lg font-medium",
        level === 5 && "text-fluid-base font-medium",
        level === 6 && "text-fluid-sm font-medium",
        gradient && "cosmic-text-gradient",
        "text-white",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}

export const Body = ({ children, className, ...props }: TypographyProps & { size?: 'sm' | 'base' | 'lg' }) => {
  const { size = 'base', ...rest } = props as any
  
  return (
    <p
      className={cn(
        size === 'sm' && "text-fluid-sm",
        size === 'base' && "text-fluid-base", 
        size === 'lg' && "text-fluid-lg",
        "text-white/80 leading-relaxed",
        className
      )}
      {...rest}
    >
      {children}
    </p>
  )
}

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon, 
  children, 
  className,
  disabled,
  ...props 
}: ButtonProps) => {
  const baseClasses = "btn-responsive cosmic-focus-ring"
  
  const variantClasses = {
    primary: "cosmic-button-primary",
    secondary: "cosmic-button-secondary", 
    ghost: "cosmic-button-ghost",
    glass: "cosmic-button-glass",
    accent: "cosmic-button-accent"
  }
  
  const sizeClasses = {
    sm: "cosmic-button-sm",
    md: "",
    lg: "cosmic-button-lg", 
    xl: "cosmic-button-xl"
  }

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span className="text-fluid-base">Loading...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="text-fluid-base font-medium">{children}</span>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// INPUT COMPONENTS  
// ============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  startIcon?: ReactNode
  endIcon?: ReactNode
}

export const Input = ({ 
  label, 
  error, 
  helperText, 
  startIcon, 
  endIcon, 
  className,
  ...props 
}: InputProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-fluid-sm font-semibold text-white">
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/60">{startIcon}</span>
          </div>
        )}
        <input
          className={cn(
            "input-responsive w-full cosmic-focus-ring",
            startIcon && "pl-10",
            endIcon && "pr-10",
            error && "cosmic-error border-red-500/50 bg-red-500/5",
            className
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-white/60">{endIcon}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-fluid-sm text-red-400 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-fluid-sm text-white/60">{helperText}</p>
      )}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextareaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = ({ 
  label, 
  error, 
  helperText, 
  className,
  ...props 
}: TextareaProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-fluid-sm font-semibold text-white">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "input-responsive w-full resize-none cosmic-focus-ring",
          error && "cosmic-error border-red-500/50 bg-red-500/5",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-fluid-sm text-red-400 flex items-center gap-1">
          <span>⚠️</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-fluid-sm text-white/60">{helperText}</p>
      )}
    </div>
  )
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'premium' | 'hero'
  interactive?: boolean
  hover?: boolean
}

export const Card = ({ 
  children, 
  variant = 'default', 
  interactive = false, 
  hover = false,
  className,
  ...props 
}: CardProps) => {
  return (
    <div
      className={cn(
        "card-responsive",
        variant === 'premium' && "cosmic-card-premium",
        variant === 'hero' && "cosmic-card-hero", 
        interactive && "cosmic-card-interactive cursor-pointer",
        hover && "hover:scale-105 transition-transform",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

interface SkeletonProps {
  className?: string
  lines?: number
  height?: string
}

export const Skeleton = ({ className, lines = 1, height = "1rem" }: SkeletonProps) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "skeleton-responsive animate-pulse",
            className
          )}
          style={{ height }}
        />
      ))}
    </div>
  )
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner = ({ size = 'md', className }: SpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border",
    md: "w-6 h-6 border-2", 
    lg: "w-8 h-8 border-2"
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingDotsProps {
  className?: string
}

export const LoadingDots = ({ className }: LoadingDotsProps) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-current rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// STATUS & FEEDBACK COMPONENTS
// ============================================================================

interface StatusProps {
  variant: 'success' | 'error' | 'warning' | 'info'
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export const Status = ({ variant, children, icon, className }: StatusProps) => {
  const variantClasses = {
    success: "cosmic-status-success",
    error: "cosmic-status-error",
    warning: "cosmic-status-warning", 
    info: "cosmic-status-info"
  }

  const defaultIcons = {
    success: "✅",
    error: "❌", 
    warning: "⚠️",
    info: "ℹ️"
  }

  return (
    <div className={cn("cosmic-status-indicator", variantClasses[variant], className)}>
      <span className="flex-shrink-0">{icon || defaultIcons[variant]}</span>
      <span className="text-fluid-sm font-medium">{children}</span>
    </div>
  )
}

interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: ReactNode
  onClose?: () => void
  className?: string
}

export const Alert = ({ variant, title, children, onClose, className }: AlertProps) => {
  const variantClasses = {
    success: "bg-green-500/10 border-green-500/20 text-green-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400"
  }

  return (
    <div className={cn(
      "card-responsive border",
      variantClasses[variant],
      className
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {title && (
            <h4 className="text-fluid-base font-semibold mb-2">{title}</h4>
          )}
          <div className="text-fluid-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-current/60 hover:text-current min-touch-target"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// GRID COMPONENTS
// ============================================================================

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  responsive?: boolean
  gap?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}

export const Grid = ({ 
  children, 
  cols = 1, 
  responsive = true, 
  gap = 'base',
  className,
  ...props 
}: GridProps) => {
  const gapClasses = {
    xs: "gap-fluid-xs",
    sm: "gap-fluid-sm", 
    base: "gap-fluid-base",
    lg: "gap-fluid-lg",
    xl: "gap-fluid-xl"
  }

  return (
    <div
      className={cn(
        "grid-responsive",
        responsive && cols >= 2 && "grid-responsive-sm-2",
        responsive && cols >= 3 && "grid-responsive-md-3", 
        responsive && cols >= 4 && "grid-responsive-lg-4",
        responsive && cols >= 5 && "grid-responsive-xl-5",
        responsive && cols >= 6 && "grid-responsive-xl-6",
        !responsive && `grid-cols-${cols}`,
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export const Modal = ({ isOpen, onClose, children, title, className }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal-responsive" onClick={onClose}>
      <div 
        className={cn("modal-content-responsive", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-fluid-lg border-b border-white/10">
            <div className="flex justify-between items-center">
              <Heading level={3}>{title}</Heading>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white min-touch-target"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="p-fluid-lg">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// IMAGE COMPONENTS
// ============================================================================

interface OptimizedImageProps extends HTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  aspectRatio?: 'square' | 'video' | 'photo' | 'portrait' | 'golden'
  loading?: 'lazy' | 'eager'
  fit?: 'cover' | 'contain' | 'fill'
  className?: string
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  aspectRatio = 'square',
  loading = 'lazy',
  fit = 'cover', 
  className,
  ...props 
}: OptimizedImageProps) => {
  return (
    <div className={cn(
      aspectRatio && `aspect-${aspectRatio}`,
      "overflow-hidden rounded-xl",
      className
    )}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          "image-optimized transition-transform hover:scale-105",
          fit === 'contain' && "image-contain",
          fit === 'fill' && "image-fill"
        )}
        {...props}
      />
    </div>
  )
}

// ============================================================================
// PROGRESS COMPONENTS
// ============================================================================

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
}

export const Progress = ({ value, max = 100, className, showLabel = false }: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex justify-between text-fluid-sm text-white/80">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("cosmic-progress h-2", className)}>
        <div 
          className="cosmic-progress-bar h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Export all components
export const FlowBotzDesignSystem = {
  // Typography
  Display,
  Heading,
  Body,
  
  // Inputs
  Button,
  Input, 
  Textarea,
  
  // Layout
  Card,
  Grid,
  Modal,
  
  // Feedback
  Status,
  Alert,
  Progress,
  
  // Loading
  Skeleton,
  Spinner,
  LoadingDots,
  
  // Media
  OptimizedImage
}

export default FlowBotzDesignSystem
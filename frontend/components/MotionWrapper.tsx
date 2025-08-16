'use client'

import { useEffect, useRef, useState } from 'react'

interface MotionWrapperProps {
  children: React.ReactNode
  delay?: number
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'bounce'
  duration?: number
  className?: string
  style?: React.CSSProperties
}

export default function MotionWrapper({ 
  children, 
  delay = 0, 
  animation = 'fadeIn', 
  duration = 0.6,
  className = '',
  style = {}
}: MotionWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setTimeout(() => {
            setIsVisible(true)
            setHasAnimated(true)
          }, delay)
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [delay, hasAnimated])

  const getAnimationStyles = () => {
    const baseStyle: React.CSSProperties = {
      transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
      willChange: 'transform, opacity',
    }

    if (!isVisible) {
      switch (animation) {
        case 'fadeIn':
          return { ...baseStyle, opacity: 0 }
        case 'slideUp':
          return { ...baseStyle, opacity: 0, transform: 'translateY(30px)' }
        case 'slideDown':
          return { ...baseStyle, opacity: 0, transform: 'translateY(-30px)' }
        case 'slideLeft':
          return { ...baseStyle, opacity: 0, transform: 'translateX(30px)' }
        case 'slideRight':
          return { ...baseStyle, opacity: 0, transform: 'translateX(-30px)' }
        case 'scale':
          return { ...baseStyle, opacity: 0, transform: 'scale(0.9)' }
        case 'bounce':
          return { ...baseStyle, opacity: 0, transform: 'scale(0.8) translateY(20px)' }
        default:
          return { ...baseStyle, opacity: 0 }
      }
    } else {
      return {
        ...baseStyle,
        opacity: 1,
        transform: 'translateX(0) translateY(0) scale(1)',
      }
    }
  }

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        ...style,
        ...getAnimationStyles(),
      }}
    >
      {children}
    </div>
  )
}
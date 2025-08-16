"use client"

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'

// Page transition animations
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    filter: 'blur(4px)'
  },
  enter: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3
    }
  }
}

// Stagger container for child animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

// Individual item animations
export const staggerItem: Variants = {
  initial: { 
    opacity: 0, 
    y: 15,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Typewriter Effect Component
interface TypewriterProps {
  text: string
  className?: string
  speed?: number
  cursor?: boolean
}

export const TypewriterText = ({ 
  text, 
  className = '',
  speed = 50,
  cursor = true 
}: TypewriterProps) => {
  return (
    <motion.div className={`relative ${className}`}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {text.split('').map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: index * (speed / 1000),
              duration: 0.1
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
      
      {cursor && (
        <motion.span
          className="ml-1 text-purple-400"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </motion.div>
  )
}

// Floating Action Button with magnetic hover
interface FloatingButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
}

export const FloatingButton = ({ children, onClick, className = '' }: FloatingButtonProps) => {
  return (
    <motion.button
      className={`relative ${className}`}
      onClick={onClick}
      whileHover={{
        scale: 1.1,
        rotate: [0, -5, 5, 0],
        transition: { duration: 0.4 }
      }}
      whileTap={{ scale: 0.95 }}
      animate={{
        y: [0, -5, 0],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {children}
    </motion.button>
  )
}

// 3D Card Flip Animation
interface CardFlipProps {
  front: ReactNode
  back: ReactNode
  isFlipped: boolean
  className?: string
}

export const CardFlip = ({ front, back, isFlipped, className = '' }: CardFlipProps) => {
  return (
    <motion.div
      className={`relative w-full h-full ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Front */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ backfaceVisibility: 'hidden' }}
      >
        {front}
      </motion.div>
      
      {/* Back */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
      >
        {back}
      </motion.div>
    </motion.div>
  )
}

// Magnetic hover effect
export const MagneticHover = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.05,
        transition: { type: 'spring', stiffness: 400, damping: 17 }
      }}
      whileTap={{ scale: 0.95 }}
      animate={{
        filter: 'brightness(1)',
        transition: { duration: 0.2 }
      }}
      whileInView={{
        filter: 'brightness(1.1)',
        transition: { duration: 0.3 }
      }}
    >
      {children}
    </motion.div>
  )
}

// Success Celebration Animation
export const SuccessCelebration = ({ trigger }: { trigger: boolean }) => {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Confetti particles */}
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][i % 4],
                left: '50%',
                top: '50%'
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0
              }}
              animate={{
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                scale: [0, 1, 0],
                rotate: Math.random() * 360
              }}
              transition={{
                duration: 2,
                ease: "easeOut",
                delay: Math.random() * 0.5
              }}
            />
          ))}
          
          {/* Success message */}
          <motion.div
            className="text-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
          >
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-compact-lg font-bold text-white">Amazing!</h3>
            <p className="text-compact-sm text-white/70">Your creation is ready</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Loading shimmer animation
export const ShimmerLoader = ({ className = '' }: { className?: string }) => {
  return (
    <motion.div
      className={`relative overflow-hidden bg-white/10 rounded-lg ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        backgroundSize: '200% 100%'
      }}
    />
  )
}

// Scale on view animation hook
export const scaleOnViewVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 50
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      type: "spring",
      stiffness: 150,
      damping: 20
    }
  }
}

// Page transition wrapper
export const PageTransition = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  )
}

// Button with ripple effect
export const RippleButton = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false 
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) => {
  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      animate={{
        opacity: disabled ? 0.6 : 1
      }}
    >
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-full scale-0"
        whileTap={{
          scale: 4,
          opacity: [0.5, 0],
          transition: { duration: 0.6 }
        }}
      />
      {children}
    </motion.button>
  )
}
"use client"

import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion'
import { AIGenerationProgress as ProgressType } from '@/hooks/useRealTimeAI'

interface EnhancedAIGenerationProgressProps {
  progress: ProgressType
  onCancel?: () => void
  onComplete?: (imageUrl: string) => void
  className?: string
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      type: "spring",
      stiffness: 200,
      damping: 20,
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.3 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
}

const particleVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1, 0],
    opacity: [0, 1, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatDelay: Math.random() * 2
    }
  }
}

const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// Particle System Component
const ParticleSystem = memo(({ isActive }: { isActive: boolean }) => {
  const particles = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {isActive && particles.map((index) => (
          <motion.div
            key={index}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            variants={particleVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            transition={{
              delay: Math.random() * 2,
              duration: 2 + Math.random() * 2
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
})

ParticleSystem.displayName = 'ParticleSystem'

// Morphing Progress Ring
const MorphingProgressRing = memo(({ progress, status }: { 
  progress: number
  status: ProgressType['status']
}) => {
  const radius = 60
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI

  const getStatusColor = (status: string) => {
    const colors = {
      initializing: '#3B82F6',
      processing: '#8B5CF6', 
      generating: '#EC4899',
      optimizing: '#F59E0B',
      completed: '#10B981',
      error: '#EF4444'
    }
    return colors[status as keyof typeof colors] || colors.processing
  }

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <motion.svg
        width={radius * 2}
        height={radius * 2}
        className="transform -rotate-90"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Background ring */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress ring */}
        <motion.circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          stroke={getStatusColor(status)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: circumference - (progress / 100) * circumference
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${getStatusColor(status)}40)`
          }}
        />
      </motion.svg>
      
      {/* Center content */}
      <motion.div 
        className="absolute inset-0 flex flex-col items-center justify-center"
        variants={pulseVariants}
        animate={status !== 'completed' ? 'pulse' : ''}
      >
        <motion.div
          className="text-2xl mb-1"
          animate={{
            rotate: status === 'generating' ? 360 : 0,
            scale: status === 'completed' ? [1, 1.2, 1] : 1
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.6, times: [0, 0.5, 1] }
          }}
        >
          {status === 'initializing' && '🚀'}
          {status === 'processing' && '🧠'}
          {status === 'generating' && '🎨'}
          {status === 'optimizing' && '✨'}
          {status === 'completed' && '✅'}
          {status === 'error' && '❌'}
        </motion.div>
        <motion.span 
          className="text-sm font-bold text-white"
          key={progress}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {Math.round(progress)}%
        </motion.span>
      </motion.div>
    </div>
  )
})

MorphingProgressRing.displayName = 'MorphingProgressRing'

// Progressive Image Reveal
const ProgressiveImageReveal = memo(({ 
  imageUrl, 
  isRevealing 
}: { 
  imageUrl?: string
  isRevealing: boolean
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          className="relative w-full aspect-square rounded-xl overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <motion.img
            src={imageUrl}
            alt="Generated image"
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            initial={{ filter: "blur(20px)", scale: 1.1 }}
            animate={{ 
              filter: imageLoaded ? "blur(0px)" : "blur(20px)",
              scale: 1
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Reveal overlay effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500/50 to-pink-500/50"
            initial={{ x: "-100%" }}
            animate={{ x: isRevealing ? "100%" : "-100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          
          {/* Success sparkles */}
          <AnimatePresence>
            {imageLoaded && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    style={{
                      left: `${20 + (i % 3) * 30}%`,
                      top: `${20 + Math.floor(i / 3) * 30}%`
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      repeat: 2
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

ProgressiveImageReveal.displayName = 'ProgressiveImageReveal'

// Main Enhanced Component
export const EnhancedAIGenerationProgress = memo(({
  progress,
  onCancel,
  onComplete,
  className = ''
}: EnhancedAIGenerationProgressProps) => {
  const [showParticles, setShowParticles] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>()
  const controls = useAnimation()

  // Trigger particle effects during active generation
  useEffect(() => {
    const isActive = ['processing', 'generating', 'optimizing'].includes(progress.status)
    setShowParticles(isActive)
  }, [progress.status])

  // Handle completion with image reveal
  useEffect(() => {
    if (progress.status === 'completed' && progress.imageUrl && progress.imageUrl !== imageUrl) {
      setImageUrl(progress.imageUrl)
      // Trigger completion callback after reveal animation
      setTimeout(() => {
        onComplete?.(progress.imageUrl!)
      }, 2000)
    }
  }, [progress.status, progress.imageUrl, imageUrl, onComplete])

  // Status-based container animation
  useEffect(() => {
    if (progress.status === 'completed') {
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.8, times: [0, 0.3, 1] }
      })
    }
  }, [progress.status, controls])

  const getStatusMessage = (status: string, progress: number) => {
    const messages = {
      initializing: "Initializing AI models...",
      processing: `Processing your prompt... ${Math.round(progress)}%`,
      generating: `Creating your masterpiece... ${Math.round(progress)}%`,
      optimizing: `Adding final touches... ${Math.round(progress)}%`,
      completed: "✨ Generation complete! Revealing your creation...",
      error: "Oops! Something went wrong. Please try again."
    }
    return messages[status as keyof typeof messages] || "Working on your request..."
  }

  return (
    <motion.div
      className={`card-compact relative ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={controls}
      exit="exit"
    >
      {/* Particle System */}
      <ParticleSystem isActive={showParticles} />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <motion.div 
          className="text-center space-y-2"
          variants={itemVariants}
        >
          <motion.h3 
            className="text-compact-lg font-bold text-white"
            animate={{ 
              color: progress.status === 'completed' ? '#10B981' : '#FFFFFF' 
            }}
            transition={{ duration: 0.5 }}
          >
            {progress.status === 'completed' ? 'Generation Complete!' : 'Creating Your Vision'}
          </motion.h3>
          <motion.p 
            className="text-compact-xs text-white/70"
            key={progress.status + progress.progress}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {getStatusMessage(progress.status, progress.progress)}
          </motion.p>
        </motion.div>

        {/* Progress Ring */}
        <motion.div 
          className="flex justify-center"
          variants={itemVariants}
        >
          <MorphingProgressRing 
            progress={progress.progress} 
            status={progress.status}
          />
        </motion.div>

        {/* Stage Indicators */}
        <motion.div 
          className="grid grid-cols-4 gap-2"
          variants={itemVariants}
        >
          {[
            { name: 'Init', status: 'initializing', icon: '🚀' },
            { name: 'Think', status: 'processing', icon: '🧠' },
            { name: 'Create', status: 'generating', icon: '🎨' },
            { name: 'Polish', status: 'optimizing', icon: '✨' }
          ].map((stage, index) => {
            const isActive = progress.status === stage.status
            const isCompleted = ['initializing', 'processing', 'generating', 'optimizing'].indexOf(progress.status) > index
            
            return (
              <motion.div
                key={stage.name}
                className={`text-center p-2 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                    : isCompleted
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-white/5 border border-white/10'
                }`}
                animate={{
                  scale: isActive ? [1, 1.1, 1] : 1,
                  borderColor: isActive ? '#8B5CF6' : isCompleted ? '#10B981' : 'rgba(255,255,255,0.1)'
                }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="text-compact-sm mb-1"
                  animate={{
                    rotate: isActive ? [0, 15, -15, 0] : 0,
                    scale: isActive ? [1, 1.2, 1] : 1
                  }}
                  transition={{
                    rotate: { duration: 2, repeat: isActive ? Infinity : 0 },
                    scale: { duration: 1, repeat: isActive ? Infinity : 0 }
                  }}
                >
                  {isCompleted ? '✅' : stage.icon}
                </motion.div>
                <div className={`text-compact-xs font-medium ${
                  isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-white/50'
                }`}>
                  {stage.name}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Image Reveal */}
        <AnimatePresence>
          {progress.status === 'completed' && imageUrl && (
            <motion.div variants={itemVariants}>
              <ProgressiveImageReveal 
                imageUrl={imageUrl} 
                isRevealing={progress.status === 'completed'} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div 
          className="flex justify-center gap-3"
          variants={itemVariants}
        >
          {onCancel && progress.status !== 'completed' && progress.status !== 'error' && (
            <motion.button
              onClick={onCancel}
              className="btn-compact-sm cosmic-button-ghost hover-lift focus-ring"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
          )}
          
          {progress.status === 'error' && (
            <motion.button
              onClick={() => window.location.reload()}
              className="btn-compact cosmic-button-primary hover-lift focus-ring"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Try Again
            </motion.button>
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {progress.status === 'error' && progress.error && (
            <motion.div
              className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg radius-tight"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-red-400 text-compact-xs text-center">
                {progress.error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

EnhancedAIGenerationProgress.displayName = 'EnhancedAIGenerationProgress'
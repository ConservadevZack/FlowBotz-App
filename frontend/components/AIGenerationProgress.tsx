"use client"

import { memo, useEffect, useState } from 'react'
import { AIGenerationProgress as ProgressType, getStatusMessage, getPromptSuggestions } from '@/hooks/useRealTimeAI'
import { ProgressBar, LoadingDots, StatusIndicator } from './LoadingSkeletons'

// Utility function for status colors
const getStatusColor = (status: ProgressType['status']) => {
  const colors = {
    initializing: 'from-blue-500 to-cyan-500',
    processing: 'from-purple-500 to-pink-500',
    generating: 'from-pink-500 to-orange-500',
    optimizing: 'from-orange-500 to-yellow-500',
    completed: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500'
  }
  return colors[status] || colors.processing
}

interface AIGenerationProgressProps {
  progress: ProgressType
  onCancel?: () => void
  onOptimizePrompt?: (suggestion: string) => void
  currentPrompt?: string
  showSuggestions?: boolean
  className?: string
}

export const AIGenerationProgressDisplay = memo(({
  progress,
  onCancel,
  onOptimizePrompt,
  currentPrompt = '',
  showSuggestions = true,
  className = ''
}: AIGenerationProgressProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(progress.message)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress.progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress.progress])

  // Update dynamic messages
  useEffect(() => {
    const dynamicMessage = getStatusMessage(progress)
    setCurrentMessage(dynamicMessage)
  }, [progress.status, progress.progress])

  // Get prompt suggestions
  useEffect(() => {
    if (showSuggestions && currentPrompt && progress.status === 'processing') {
      setSuggestions(getPromptSuggestions(currentPrompt))
    }
  }, [currentPrompt, progress.status, showSuggestions])


  const getStatusIcon = (status: ProgressType['status']) => {
    const icons = {
      initializing: '🚀',
      processing: '🧠',
      generating: '🎨',
      optimizing: '✨',
      completed: '✅',
      error: '❌'
    }
    return icons[status] || '⚡'
  }

  const formatTime = (ms?: number): string => {
    if (!ms || ms <= 0) return ''
    
    const seconds = Math.ceil(ms / 1000)
    
    if (seconds < 60) {
      return `${seconds}s`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (remainingSeconds === 0) {
      return `${minutes}m`
    }
    
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className={`cosmic-card-premium p-6 space-y-6 ${className}`}>
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl animate-pulse">
            {getStatusIcon(progress.status)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {progress.status === 'completed' ? 'Generation Complete!' : 'Generating Your Image'}
            </h3>
            {progress.stage && (
              <p className="text-sm text-white/60">{progress.stage}</p>
            )}
          </div>
        </div>
        
        {onCancel && progress.status !== 'completed' && progress.status !== 'error' && (
          <button
            onClick={onCancel}
            className="text-white/60 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">{animatedProgress.toFixed(0)}%</span>
          {progress.timeRemaining && progress.timeRemaining > 0 && (
            <span className="text-white/60">
              {formatTime(progress.timeRemaining)} remaining
            </span>
          )}
        </div>
        
        <div className="relative">
          <div className="cosmic-progress h-4 mb-2">
            <div 
              className={`cosmic-progress-bar bg-gradient-to-r ${getStatusColor(progress.status)} transition-all duration-700 ease-out relative overflow-hidden`}
              style={{ width: `${animatedProgress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Message */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          {progress.status !== 'completed' && progress.status !== 'error' && (
            <LoadingDots size="sm" color="rgb(168 85 247)" />
          )}
          <p className="text-white font-medium animate-fade-in">
            {currentMessage}
          </p>
        </div>
        
        {progress.status === 'error' && progress.error && (
          <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">
            {progress.error}
          </p>
        )}
      </div>

      {/* Generation Stages Visualization */}
      {progress.status !== 'completed' && progress.status !== 'error' && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'Init', status: 'initializing', icon: '🚀' },
            { name: 'Process', status: 'processing', icon: '🧠' },
            { name: 'Generate', status: 'generating', icon: '🎨' },
            { name: 'Optimize', status: 'optimizing', icon: '✨' }
          ].map((stage, index) => {
            const isActive = progress.status === stage.status
            const isCompleted = ['initializing', 'processing', 'generating', 'optimizing'].indexOf(progress.status) > index
            
            return (
              <div
                key={stage.name}
                className={`text-center p-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                    : isCompleted
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className={`text-lg mb-1 ${isActive ? 'animate-bounce' : ''}`}>
                  {isCompleted ? '✅' : stage.icon}
                </div>
                <div className={`text-xs font-medium ${
                  isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-white/50'
                }`}>
                  {stage.name}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Prompt Suggestions */}
      {showSuggestions && suggestions.length > 0 && progress.status === 'processing' && onOptimizePrompt && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <h4 className="text-sm font-medium text-white/80">
            💡 Suggestions to improve your prompt:
          </h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onOptimizePrompt(suggestion)}
                className="w-full text-left text-sm p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 transition-all duration-200 text-white/70 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success Actions */}
      {progress.status === 'completed' && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span>✨</span>
            <span>Your image has been generated successfully!</span>
          </div>
        </div>
      )}

      {/* Performance Stats (when completed) */}
      {progress.status === 'completed' && progress.totalTime && (
        <div className="text-center text-xs text-white/50 border-t border-white/10 pt-3">
          Generated in {formatTime(progress.totalTime)}
        </div>
      )}
    </div>
  )
})

AIGenerationProgressDisplay.displayName = 'AIGenerationProgressDisplay'

// Enhanced Loading State for AI Generation
interface AIGenerationLoadingProps {
  prompt: string
  className?: string
}

export const AIGenerationLoading = memo(({ prompt, className = '' }: AIGenerationLoadingProps) => {
  const [currentTip, setCurrentTip] = useState(0)
  
  const tips = [
    "💡 Tip: More specific prompts create better results",
    "🎨 Tip: Mention art styles for unique aesthetics", 
    "⚡ Tip: Include lighting descriptions for mood",
    "🌈 Tip: Specify colors for brand consistency",
    "📐 Tip: Describe composition for better layouts"
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [tips.length])

  return (
    <div className={`cosmic-card-premium p-8 text-center space-y-6 ${className}`}>
      {/* Animated Generation Visual */}
      <div className="relative mx-auto w-32 h-32">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 animate-ping" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 animate-bounce" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl animate-spin">🎨</div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Generating Your Image</h3>
        <p className="text-white/70 text-sm max-w-md mx-auto">
          Creating: "{prompt.substring(0, 50)}{prompt.length > 50 ? '...' : ''}"
        </p>
      </div>

      {/* Loading Dots */}
      <LoadingDots size="lg" />

      {/* Rotating Tips */}
      <div className="min-h-[1.5rem] transition-all duration-500">
        <p className="text-white/60 text-sm animate-fade-in">
          {tips[currentTip]}
        </p>
      </div>
    </div>
  )
})

AIGenerationLoading.displayName = 'AIGenerationLoading'

// Compact Progress Indicator for minimal space
interface CompactProgressProps {
  progress: ProgressType
  className?: string
}

export const CompactAIProgress = memo(({ progress, className = '' }: CompactProgressProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1">
        <div className="cosmic-progress h-2 mb-1">
          <div 
            className={`cosmic-progress-bar bg-gradient-to-r ${getStatusColor(progress.status)} transition-all duration-300`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{progress.message}</span>
          <span>{progress.progress.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
})

CompactAIProgress.displayName = 'CompactAIProgress'
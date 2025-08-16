"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { LoadingDots } from './LoadingSkeletons'

interface PromptOptimizerProps {
  originalPrompt: string
  onOptimizedPrompt: (optimized: string) => void
  onClose: () => void
  isVisible: boolean
  className?: string
}

interface OptimizationSuggestion {
  type: 'style' | 'quality' | 'composition' | 'lighting' | 'color' | 'detail'
  title: string
  description: string
  keywords: string[]
  example: string
  icon: string
}

export const PromptOptimizer = memo(({
  originalPrompt,
  onOptimizedPrompt,
  onClose,
  isVisible,
  className = ''
}: PromptOptimizerProps) => {
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([])
  const [selectedOptimizations, setSelectedOptimizations] = useState<Set<string>>(new Set())
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const optimizationTypes: OptimizationSuggestion[] = [
    {
      type: 'style',
      title: 'Art Style',
      description: 'Define the artistic style and aesthetic',
      keywords: ['photorealistic', 'digital art', 'oil painting', 'watercolor', 'sketch', 'anime', 'cartoon'],
      example: 'photorealistic style',
      icon: '🎨'
    },
    {
      type: 'quality',
      title: 'Image Quality',
      description: 'Enhance overall image quality and detail',
      keywords: ['high quality', '4K', 'detailed', 'sharp', 'professional', 'masterpiece', 'award winning'],
      example: 'high quality, detailed',
      icon: '✨'
    },
    {
      type: 'lighting',
      title: 'Lighting',
      description: 'Specify lighting conditions and mood',
      keywords: ['soft lighting', 'dramatic lighting', 'golden hour', 'studio lighting', 'natural light', 'moody'],
      example: 'soft natural lighting',
      icon: '💡'
    },
    {
      type: 'composition',
      title: 'Composition',
      description: 'Improve framing and visual arrangement',
      keywords: ['centered', 'rule of thirds', 'close-up', 'wide shot', 'portrait', 'landscape orientation'],
      example: 'centered composition',
      icon: '📐'
    },
    {
      type: 'color',
      title: 'Color Palette',
      description: 'Define color scheme and vibrancy',
      keywords: ['vibrant colors', 'pastel colors', 'monochrome', 'warm tones', 'cool tones', 'high contrast'],
      example: 'vibrant warm colors',
      icon: '🌈'
    },
    {
      type: 'detail',
      title: 'Detail Level',
      description: 'Specify level of detail and texture',
      keywords: ['highly detailed', 'intricate', 'fine details', 'textured', 'smooth', 'minimalist'],
      example: 'highly detailed',
      icon: '🔍'
    }
  ]

  // Analyze prompt and suggest optimizations
  const analyzePrompt = useCallback((prompt: string) => {
    setIsAnalyzing(true)
    
    // Simulate analysis delay for better UX
    setTimeout(() => {
      const suggestions: OptimizationSuggestion[] = []
      const promptLower = prompt.toLowerCase()
      
      optimizationTypes.forEach(optimization => {
        const hasKeywords = optimization.keywords.some(keyword => 
          promptLower.includes(keyword.toLowerCase())
        )
        
        if (!hasKeywords) {
          suggestions.push(optimization)
        }
      })
      
      setOptimizations(suggestions)
      setIsAnalyzing(false)
    }, 800)
  }, [])

  // Generate optimized prompt
  const generateOptimizedPrompt = useCallback(() => {
    let enhanced = originalPrompt.trim()
    
    selectedOptimizations.forEach(type => {
      const optimization = optimizationTypes.find(opt => opt.type === type)
      if (optimization) {
        // Add the most appropriate keyword for the context
        const keyword = optimization.keywords[0] // Use the first (most common) keyword
        enhanced += `, ${keyword}`
      }
    })
    
    setOptimizedPrompt(enhanced)
  }, [originalPrompt, selectedOptimizations])

  // Toggle optimization selection
  const toggleOptimization = useCallback((type: string) => {
    setSelectedOptimizations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }, [])

  // Auto-suggest based on prompt content
  const getSmartSuggestions = useCallback((prompt: string): string[] => {
    const suggestions: string[] = []
    const promptLower = prompt.toLowerCase()
    
    // Content-based suggestions
    if (promptLower.includes('logo')) {
      suggestions.push('Add "minimalist" or "professional" for business appeal')
      suggestions.push('Consider "vector style" for scalability')
    }
    
    if (promptLower.includes('portrait')) {
      suggestions.push('Add "soft lighting" for flattering results')
      suggestions.push('Try "shallow depth of field" for focus')
    }
    
    if (promptLower.includes('landscape')) {
      suggestions.push('Add "golden hour" for warm lighting')
      suggestions.push('Try "wide angle" for expansive feel')
    }
    
    if (promptLower.includes('product')) {
      suggestions.push('Add "studio lighting" for clean presentation')
      suggestions.push('Try "white background" for commercial look')
    }
    
    // General improvements
    if (prompt.split(' ').length < 5) {
      suggestions.push('Your prompt is quite short - consider adding more details')
    }
    
    if (!promptLower.includes('quality') && !promptLower.includes('detailed')) {
      suggestions.push('Add quality keywords like "high quality" or "detailed"')
    }
    
    return suggestions
  }, [])

  // Initialize analysis when prompt changes
  useEffect(() => {
    if (isVisible && originalPrompt) {
      analyzePrompt(originalPrompt)
    }
  }, [isVisible, originalPrompt, analyzePrompt])

  // Update optimized prompt when selections change
  useEffect(() => {
    generateOptimizedPrompt()
  }, [selectedOptimizations, generateOptimizedPrompt])

  const smartSuggestions = getSmartSuggestions(originalPrompt)

  if (!isVisible) return null

  return (
    <div className={`cosmic-card-premium p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <h3 className="text-lg font-bold text-white">Optimize Your Prompt</h3>
            <p className="text-sm text-white/60">Enhance your prompt for better AI results</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Original Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/80">Original Prompt:</label>
        <div className="cosmic-card p-3 text-sm text-white/70 bg-white/5">
          "{originalPrompt}"
        </div>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
            💡 Smart Suggestions
          </h4>
          <div className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="text-sm p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Categories */}
      {isAnalyzing ? (
        <div className="text-center py-8">
          <LoadingDots size="md" />
          <p className="text-white/60 text-sm mt-3">Analyzing your prompt...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white/80">
            Suggested Improvements ({optimizations.length} available)
          </h4>
          
          {optimizations.length === 0 ? (
            <div className="text-center py-6 text-white/60">
              <span className="text-2xl block mb-2">🎉</span>
              <p>Your prompt is already well-optimized!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optimizations.map((optimization) => (
                <button
                  key={optimization.type}
                  onClick={() => toggleOptimization(optimization.type)}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                    selectedOptimizations.has(optimization.type)
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40 ring-2 ring-purple-500/30'
                      : 'bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{optimization.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-white text-sm mb-1">
                        {optimization.title}
                      </h5>
                      <p className="text-xs text-white/60 mb-2">
                        {optimization.description}
                      </p>
                      <div className="text-xs text-purple-400 font-mono">
                        + {optimization.example}
                      </div>
                    </div>
                    {selectedOptimizations.has(optimization.type) && (
                      <span className="text-green-400 text-sm">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optimized Prompt Preview */}
      {selectedOptimizations.size > 0 && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <label className="text-sm font-medium text-white/80">Optimized Prompt:</label>
          <div className="cosmic-card p-4 text-sm text-white bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            "{optimizedPrompt}"
          </div>
          
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="text-green-400">✨</span>
            <span>
              Added {selectedOptimizations.size} enhancement{selectedOptimizations.size !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onOptimizedPrompt(optimizedPrompt || originalPrompt)}
          disabled={selectedOptimizations.size === 0}
          className="flex-1 cosmic-button cosmic-button-primary cosmic-button-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedOptimizations.size > 0 ? 'Use Optimized Prompt' : 'Use Original Prompt'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Tips */}
      <div className="text-xs text-white/50 bg-white/5 p-3 rounded-lg">
        💡 <strong>Pro tip:</strong> The order of keywords matters! More important descriptors should come first.
      </div>
    </div>
  )
})

PromptOptimizer.displayName = 'PromptOptimizer'

// Quick optimization buttons for common improvements
interface QuickOptimizeProps {
  onOptimize: (addition: string) => void
  className?: string
}

export const QuickOptimizeButtons = memo(({ onOptimize, className = '' }: QuickOptimizeProps) => {
  const quickOptimizations = [
    { label: 'High Quality', addition: ', high quality, detailed', icon: '✨' },
    { label: 'Professional', addition: ', professional, clean', icon: '💼' },
    { label: 'Artistic', addition: ', artistic, creative style', icon: '🎨' },
    { label: 'Vibrant', addition: ', vibrant colors, eye-catching', icon: '🌈' }
  ]

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {quickOptimizations.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onOptimize(opt.addition)}
          className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-purple-500/20 text-white/70 hover:text-white border border-white/20 hover:border-purple-500/30 transition-all duration-200 flex items-center gap-1"
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
})

QuickOptimizeButtons.displayName = 'QuickOptimizeButtons'
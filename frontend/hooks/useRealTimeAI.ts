"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiService } from '@/lib/api'

export interface AIGenerationProgress {
  progress: number
  status: 'initializing' | 'processing' | 'generating' | 'optimizing' | 'completed' | 'error'
  message: string
  timeRemaining?: number
  totalTime?: number
  stage?: string
  error?: string
  result?: string
}

export interface AIGenerationOptions {
  prompt: string
  model?: string
  size?: string
  style?: string
  onProgress?: (progress: AIGenerationProgress) => void
  onComplete?: (result: string) => void
  onError?: (error: string) => void
}

export const useRealTimeAI = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<AIGenerationProgress>({
    progress: 0,
    status: 'initializing',
    message: 'Ready to generate...'
  })
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const abortController = useRef<AbortController | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const startTime = useRef<number>(0)

  // Simulate realistic progress updates for better UX
  const simulateProgress = useCallback((targetProgress: number, duration: number, message: string, stage?: string) => {
    return new Promise<void>((resolve) => {
      const startProgress = progress.progress
      const progressDiff = targetProgress - startProgress
      const stepCount = Math.max(1, Math.floor(duration / 100))
      const progressStep = progressDiff / stepCount
      const timeStep = duration / stepCount
      
      let currentStep = 0
      
      const updateProgress = () => {
        currentStep++
        const newProgress = Math.min(startProgress + (progressStep * currentStep), targetProgress)
        const elapsed = Date.now() - startTime.current
        const estimatedTotal = elapsed / (newProgress / 100)
        const timeRemaining = Math.max(0, estimatedTotal - elapsed)
        
        setProgress(prev => ({
          ...prev,
          progress: newProgress,
          message,
          stage,
          timeRemaining: timeRemaining,
          totalTime: estimatedTotal
        }))
        
        if (currentStep >= stepCount) {
          resolve()
        }
      }
      
      progressInterval.current = setInterval(updateProgress, timeStep)
    })
  }, [progress.progress])

  // Enhanced prompt optimization for better results and speed
  const optimizePrompt = useCallback((prompt: string, style: string): string => {
    const optimizations: Record<string, string> = {
      photorealistic: ', high quality, professional photography, detailed, sharp focus',
      artistic: ', digital art, vibrant colors, creative, artistic style',
      minimalist: ', clean, simple, minimal design, modern',
      vintage: ', retro style, vintage aesthetic, aged look',
      cartoon: ', cartoon style, animated, colorful, fun',
      abstract: ', abstract art, creative, unique composition'
    }
    
    const baseOptimization = optimizations[style] || optimizations.photorealistic
    
    // Add quality enhancers based on prompt content
    let enhancedPrompt = prompt
    
    if (!prompt.toLowerCase().includes('high quality')) {
      enhancedPrompt += baseOptimization
    }
    
    // Optimize for speed by being more specific
    if (prompt.length < 20) {
      enhancedPrompt += ', detailed, well-composed'
    }
    
    return enhancedPrompt
  }, [])

  // Select optimal model based on prompt complexity
  const selectOptimalModel = useCallback((prompt: string, requestedModel?: string): string => {
    if (requestedModel) return requestedModel
    
    const complexity = prompt.split(' ').length
    const hasComplexRequirements = /detailed|complex|intricate|elaborate/.test(prompt.toLowerCase())
    
    // Use faster models for simpler prompts
    if (complexity < 10 && !hasComplexRequirements) {
      return 'stable-diffusion' // Faster
    }
    
    return 'dall-e-3' // Higher quality for complex prompts
  }, [])

  const generateImage = useCallback(async (options: AIGenerationOptions) => {
    if (isGenerating) {
      throw new Error('Generation already in progress')
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)
    startTime.current = Date.now()
    
    // Create abort controller for cancellation
    abortController.current = new AbortController()
    
    try {
      // Get user token for WebSocket connection
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Get user ID for WebSocket connection
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
      const userId = userProfile.id || 'anonymous'

      // Establish WebSocket connection for real-time progress
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/api/ai/ws/generate-progress/${userId}`
      
      const websocket = new WebSocket(wsUrl)
      websocketRef.current = websocket
      
      websocket.onopen = () => {
        console.log('WebSocket connected for AI generation progress')
      }
      
      websocket.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data)
          
          setProgress({
            progress: progressData.progress || 0,
            status: progressData.status || 'processing',
            message: progressData.message || 'Processing...',
            stage: progressData.stage,
            timeRemaining: progressData.time_remaining_ms,
            totalTime: progressData.total_time_ms
          })
          
          // Call progress callback
          options.onProgress?.(progressData)
          
          // Handle completion
          if (progressData.status === 'completed' && progressData.progress >= 100) {
            websocket.close()
            setIsGenerating(false)
          }
          
          // Handle error
          if (progressData.status === 'error') {
            setError(progressData.error || 'Generation failed')
            options.onError?.(progressData.error || 'Generation failed')
            websocket.close()
            setIsGenerating(false)
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e)
        }
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error')
        setIsGenerating(false)
      }
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected')
      }
      
      // Start the generation using the streaming endpoint
      const response = await apiService.ai.generateImageStream(
        options.prompt,
        options.model,
        options.size || '1024x1024',
        options.style || 'photorealistic',
        'balanced'
      )
      
      // Set final result
      setResult(response.url)
      options.onComplete?.(response.url)
      
      // Close WebSocket connection
      websocket.close()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed'
      
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: 'Generation failed',
        error: errorMessage
      }))
      
      setError(errorMessage)
      options.onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }
    }
  }, [isGenerating])

  const cancelGeneration = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    
    // Close WebSocket connection
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
    
    setIsGenerating(false)
    setProgress({
      progress: 0,
      status: 'initializing',
      message: 'Generation cancelled',
    })
  }, [])

  const resetState = useCallback(() => {
    setIsGenerating(false)
    setProgress({
      progress: 0,
      status: 'initializing',
      message: 'Ready to generate...'
    })
    setResult(null)
    setError(null)
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
  }, [])

  // Format time remaining for display
  const formatTimeRemaining = useCallback((ms?: number): string => {
    if (!ms || ms <= 0) return ''
    
    const seconds = Math.ceil(ms / 1000)
    
    if (seconds < 60) {
      return `${seconds}s remaining`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    return `${minutes}m ${remainingSeconds}s remaining`
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  return {
    generateImage,
    cancelGeneration,
    resetState,
    isGenerating,
    progress,
    result,
    error,
    formatTimeRemaining
  }
}

// Advanced generation status messages for better UX
export const getStatusMessage = (progress: AIGenerationProgress): string => {
  const messages = {
    initializing: [
      'Preparing your creative vision...',
      'Setting up AI brushes and canvas...',
      'Loading artistic inspiration...'
    ],
    processing: [
      'Understanding your prompt...',
      'Analyzing visual requirements...',
      'Planning composition layout...'
    ],
    generating: [
      'Painting your imagination...',
      'Crafting unique visuals...',
      'Bringing ideas to life...',
      'Creating something amazing...'
    ],
    optimizing: [
      'Adding final polish...',
      'Enhancing image quality...',
      'Perfecting the details...'
    ],
    completed: [
      'Your masterpiece is ready!',
      'Creation complete!',
      'Success! Your image is beautiful!'
    ],
    error: [
      'Something went wrong...',
      'Generation encountered an issue...',
      'Please try again...'
    ]
  }
  
  const statusMessages = messages[progress.status] || messages.initializing
  const messageIndex = Math.floor(progress.progress / (100 / statusMessages.length))
  
  return statusMessages[Math.min(messageIndex, statusMessages.length - 1)]
}

// Dynamic prompt suggestions based on current input
export const getPromptSuggestions = (currentPrompt: string): string[] => {
  const prompt = currentPrompt.toLowerCase()
  
  if (prompt.includes('logo')) {
    return [
      'Add "minimalist design" for cleaner results',
      'Try "professional and modern" for business appeal',
      'Include specific colors for brand consistency'
    ]
  }
  
  if (prompt.includes('t-shirt') || prompt.includes('apparel')) {
    return [
      'Add "bold and eye-catching" for better print results',
      'Try "vintage style" for retro appeal',
      'Include "simple design" for versatile placement'
    ]
  }
  
  if (prompt.includes('nature') || prompt.includes('landscape')) {
    return [
      'Add "golden hour lighting" for warmth',
      'Try "dramatic sky" for more impact',
      'Include "high detail" for realistic results'
    ]
  }
  
  return [
    'Add style keywords like "photorealistic" or "artistic"',
    'Include lighting terms like "soft lighting" or "dramatic"',
    'Specify colors for better results',
    'Add quality modifiers like "high detail" or "professional"'
  ]
}
"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { LoadingDots } from './LoadingSkeletons'

interface GenerationVariation {
  id: string
  prompt: string
  model: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
  generationTime?: number
  seed?: number
}

interface BatchGenerationJob {
  id: string
  basePrompt: string
  variations: GenerationVariation[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  totalCreditsUsed: number
}

interface BatchGeneratorProps {
  basePrompt: string
  onBatchComplete: (results: GenerationVariation[]) => void
  onClose: () => void
  isVisible: boolean
  className?: string
}

export const BatchGenerator = memo(({
  basePrompt,
  onBatchComplete,
  onClose,
  isVisible,
  className = ''
}: BatchGeneratorProps) => {
  const [currentJob, setCurrentJob] = useState<BatchGenerationJob | null>(null)
  const [variationCount, setVariationCount] = useState(4)
  const [selectedModels, setSelectedModels] = useState<string[]>(['dall-e-3'])
  const [variationType, setVariationType] = useState<'style' | 'content' | 'mixed'>('style')
  const [isGenerating, setIsGenerating] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)

  const availableModels = [
    { id: 'dall-e-3', name: 'DALL-E 3', credits: 4, speed: 'slow', quality: 'excellent' },
    { id: 'stability-ai', name: 'Stability AI', credits: 2, speed: 'fast', quality: 'good' },
    { id: 'replicate', name: 'Replicate', credits: 3, speed: 'medium', quality: 'very good' }
  ]

  const variationTypes = [
    {
      id: 'style',
      name: 'Style Variations',
      description: 'Same content, different artistic styles',
      variations: [
        'photorealistic style',
        'digital art style', 
        'oil painting style',
        'watercolor style',
        'sketch style',
        'anime style'
      ]
    },
    {
      id: 'content',
      name: 'Content Variations',
      description: 'Different angles, compositions, and scenes',
      variations: [
        'close-up view',
        'wide angle shot',
        'from above perspective',
        'dramatic angle',
        'side view',
        'detailed macro shot'
      ]
    },
    {
      id: 'mixed',
      name: 'Mixed Variations',
      description: 'Random combination of style and content changes',
      variations: [
        'vibrant colors, dramatic lighting',
        'monochrome, minimalist composition',
        'warm tones, soft lighting',
        'high contrast, bold shadows',
        'pastel colors, dreamy atmosphere',
        'neon colors, futuristic style'
      ]
    }
  ]

  // Calculate estimated cost
  const calculateEstimatedCost = useCallback(() => {
    const totalVariations = variationCount * selectedModels.length
    const avgCreditsPerModel = selectedModels.reduce((sum, modelId) => {
      const model = availableModels.find(m => m.id === modelId)
      return sum + (model?.credits || 2)
    }, 0) / selectedModels.length
    
    setEstimatedCost(Math.ceil(totalVariations * avgCreditsPerModel))
  }, [variationCount, selectedModels])

  // Generate prompt variations
  const generatePromptVariations = useCallback((basePrompt: string, type: string, count: number): string[] => {
    const variationSet = variationTypes.find(vt => vt.id === type)
    if (!variationSet) return [basePrompt]

    const variations: string[] = []
    const selectedVariations = variationSet.variations.slice(0, count)
    
    selectedVariations.forEach(variation => {
      variations.push(`${basePrompt}, ${variation}`)
    })

    // Fill remaining slots with base prompt if needed
    while (variations.length < count) {
      variations.push(`${basePrompt}, high quality, detailed`)
    }

    return variations
  }, [])

  // Start batch generation
  const startBatchGeneration = useCallback(async () => {
    if (!basePrompt.trim() || selectedModels.length === 0) return

    setIsGenerating(true)
    
    const promptVariations = generatePromptVariations(basePrompt, variationType, variationCount)
    const allVariations: GenerationVariation[] = []

    // Create variations for each model
    selectedModels.forEach(model => {
      promptVariations.forEach((prompt, index) => {
        allVariations.push({
          id: `${model}_${index}_${Date.now()}`,
          prompt,
          model,
          status: 'pending',
          seed: Math.floor(Math.random() * 1000000)
        })
      })
    })

    const job: BatchGenerationJob = {
      id: `batch_${Date.now()}`,
      basePrompt,
      variations: allVariations,
      status: 'pending',
      startTime: new Date(),
      totalCreditsUsed: 0
    }

    setCurrentJob(job)
    
    // Start generating (simulate async generation)
    await processBatchGeneration(job)
  }, [basePrompt, selectedModels, variationType, variationCount, generatePromptVariations])

  // Process batch generation
  const processBatchGeneration = useCallback(async (job: BatchGenerationJob) => {
    const updatedJob = { ...job, status: 'running' as const }
    setCurrentJob(updatedJob)

    for (let i = 0; i < job.variations.length; i++) {
      const variation = job.variations[i]
      const model = availableModels.find(m => m.id === variation.model)
      
      // Update variation status to generating
      updatedJob.variations[i] = { ...variation, status: 'generating' }
      setCurrentJob({ ...updatedJob })

      try {
        // Simulate API call delay based on model speed
        const delay = model?.speed === 'fast' ? 2000 : model?.speed === 'medium' ? 4000 : 6000
        await new Promise(resolve => setTimeout(resolve, delay))

        // Simulate generation result (in real app, this would be an API call)
        const isSuccess = Math.random() > 0.1 // 90% success rate
        
        if (isSuccess) {
          updatedJob.variations[i] = {
            ...variation,
            status: 'completed',
            imageUrl: `https://picsum.photos/512/512?random=${variation.seed}`,
            generationTime: delay
          }
          updatedJob.totalCreditsUsed += model?.credits || 2
        } else {
          updatedJob.variations[i] = {
            ...variation,
            status: 'failed',
            error: 'Generation failed due to content policy or technical error'
          }
        }
        
        setCurrentJob({ ...updatedJob })
      } catch (error) {
        updatedJob.variations[i] = {
          ...variation,
          status: 'failed',
          error: 'Network error during generation'
        }
        setCurrentJob({ ...updatedJob })
      }
    }

    // Mark job as completed
    updatedJob.status = 'completed'
    updatedJob.endTime = new Date()
    setCurrentJob({ ...updatedJob })
    setIsGenerating(false)

    // Return successful generations
    const completedVariations = updatedJob.variations.filter(v => v.status === 'completed')
    onBatchComplete(completedVariations)
  }, [onBatchComplete])

  // Cancel batch generation
  const cancelGeneration = useCallback(() => {
    if (currentJob) {
      const cancelledJob = {
        ...currentJob,
        status: 'failed' as const,
        variations: currentJob.variations.map(v => 
          v.status === 'pending' || v.status === 'generating'
            ? { ...v, status: 'failed' as const, error: 'Cancelled by user' }
            : v
        )
      }
      setCurrentJob(cancelledJob)
    }
    setIsGenerating(false)
  }, [currentJob])

  // Toggle model selection
  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }, [])

  useEffect(() => {
    calculateEstimatedCost()
  }, [calculateEstimatedCost])

  if (!isVisible) return null

  const completedCount = currentJob?.variations.filter(v => v.status === 'completed').length || 0
  const failedCount = currentJob?.variations.filter(v => v.status === 'failed').length || 0
  const totalVariations = currentJob?.variations.length || 0

  return (
    <div className={`cosmic-card-premium p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="text-lg font-bold text-white">Batch Generation</h3>
            <p className="text-sm text-white/60">Create multiple variations at once</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Base Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/80">Base Prompt:</label>
        <div className="cosmic-card p-3 text-sm text-white/70 bg-white/5">
          "{basePrompt}"
        </div>
      </div>

      {!currentJob && (
        <>
          {/* Configuration */}
          <div className="space-y-4">
            {/* Variation Count */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">
                Variations per Model: {variationCount}
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={variationCount}
                onChange={(e) => setVariationCount(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>1</span>
                <span>8</span>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-3 block">
                AI Models:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedModels.includes(model.id)
                        ? 'bg-purple-500/20 border-purple-500/40 ring-2 ring-purple-500/30'
                        : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                    }`}
                  >
                    <div className="font-medium text-white text-sm mb-1">
                      {model.name}
                    </div>
                    <div className="text-xs text-white/60 space-y-1">
                      <div>💳 {model.credits} credits</div>
                      <div>⚡ {model.speed}</div>
                      <div>⭐ {model.quality}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Variation Type */}
            <div>
              <label className="text-sm font-medium text-white/80 mb-3 block">
                Variation Type:
              </label>
              <div className="space-y-2">
                {variationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setVariationType(type.id as any)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      variationType === type.id
                        ? 'bg-purple-500/20 border-purple-500/40'
                        : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                    }`}
                  >
                    <div className="font-medium text-white text-sm mb-1">
                      {type.name}
                    </div>
                    <div className="text-xs text-white/60">
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="cosmic-card p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">💰</span>
                <span className="text-sm font-medium text-white">Cost Estimate</span>
              </div>
              <div className="text-sm text-white/80">
                <div>Total variations: {variationCount * selectedModels.length}</div>
                <div>Estimated credits: {estimatedCost}</div>
                <div className="text-xs text-white/60 mt-1">
                  Actual cost may vary based on generation success rate
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startBatchGeneration}
            disabled={selectedModels.length === 0}
            className="w-full cosmic-button cosmic-button-primary cosmic-button-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Batch Generation ({estimatedCost} credits)
          </button>
        </>
      )}

      {/* Generation Progress */}
      {currentJob && (
        <div className="space-y-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Generation Progress</h4>
              <p className="text-sm text-white/60">
                {completedCount} completed, {failedCount} failed, {totalVariations - completedCount - failedCount} remaining
              </p>
            </div>
            {isGenerating && (
              <button
                onClick={cancelGeneration}
                className="cosmic-button cosmic-button-secondary cosmic-button-sm"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((completedCount + failedCount) / totalVariations) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>{completedCount + failedCount} / {totalVariations}</span>
              <span>{Math.round(((completedCount + failedCount) / totalVariations) * 100)}%</span>
            </div>
          </div>

          {/* Generation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {currentJob.variations.map((variation) => (
              <div 
                key={variation.id}
                className={`cosmic-card p-3 space-y-2 ${
                  variation.status === 'completed' ? 'ring-2 ring-green-500/50' :
                  variation.status === 'failed' ? 'ring-2 ring-red-500/50' :
                  variation.status === 'generating' ? 'ring-2 ring-yellow-500/50' :
                  'ring-1 ring-white/20'
                }`}
              >
                {/* Model Badge */}
                <div className="text-xs font-medium text-white/80">
                  {availableModels.find(m => m.id === variation.model)?.name}
                </div>

                {/* Image/Status */}
                <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                  {variation.status === 'completed' && variation.imageUrl ? (
                    <img 
                      src={variation.imageUrl} 
                      alt="Generated" 
                      className="w-full h-full object-cover"
                    />
                  ) : variation.status === 'generating' ? (
                    <div className="text-center">
                      <LoadingDots size="sm" />
                      <div className="text-xs text-white/60 mt-1">Generating...</div>
                    </div>
                  ) : variation.status === 'failed' ? (
                    <div className="text-center text-red-400">
                      <div className="text-lg">❌</div>
                      <div className="text-xs">Failed</div>
                    </div>
                  ) : (
                    <div className="text-center text-white/40">
                      <div className="text-lg">⏳</div>
                      <div className="text-xs">Pending</div>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {variation.status === 'failed' && variation.error && (
                  <div className="text-xs text-red-400 truncate" title={variation.error}>
                    {variation.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {currentJob.status === 'completed' && (
            <div className="cosmic-card p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400">✅</span>
                <span className="text-sm font-medium text-white">Batch Complete!</span>
              </div>
              <div className="text-sm text-white/80 space-y-1">
                <div>Successfully generated: {completedCount} images</div>
                <div>Credits used: {currentJob.totalCreditsUsed}</div>
                <div>
                  Total time: {currentJob.startTime && currentJob.endTime ? 
                    Math.round((currentJob.endTime.getTime() - currentJob.startTime.getTime()) / 1000) : 0}s
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

BatchGenerator.displayName = 'BatchGenerator'
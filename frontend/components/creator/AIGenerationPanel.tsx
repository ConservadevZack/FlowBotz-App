'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Wand2, 
  Palette, 
  Image as ImageIcon,
  Settings,
  Loader2,
  Download,
  RefreshCw,
  Grid3x3,
  Zap,
  Crown,
  Stars
} from 'lucide-react';
import { 
  AIModel, 
  AIGenerationOptions, 
  STYLE_PRESETS, 
  aiService,
  AIGenerationResult
} from '@/lib/services/ai-service';
import toast from 'react-hot-toast';

interface AIGenerationPanelProps {
  onImageGenerated: (result: AIGenerationResult) => void;
  credits?: number;
}

export default function AIGenerationPanel({ 
  onImageGenerated,
  credits = 100 
}: AIGenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(AIModel.DALLE3);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<Partial<AIGenerationOptions>>({
    width: 1024,
    height: 1024,
    quality: 'standard',
    steps: 30,
    guidanceScale: 7.5,
    numOutputs: 1,
    enhancePrompt: true
  });
  const [recentGenerations, setRecentGenerations] = useState<AIGenerationResult[]>([]);

  const models = [
    { id: AIModel.DALLE3, name: 'DALL-E 3', icon: Stars, credits: 5, badge: 'Popular' },
    { id: AIModel.STABLE_DIFFUSION_XL, name: 'Stable Diffusion XL', icon: Zap, credits: 3 },
    { id: AIModel.STABLE_DIFFUSION_3, name: 'Stable Diffusion 3', icon: Crown, credits: 4, badge: 'New' },
    { id: AIModel.MIDJOURNEY, name: 'Midjourney V6', icon: Sparkles, credits: 6, badge: 'Premium', disabled: true },
    { id: AIModel.FLUX, name: 'Flux Pro', icon: Wand2, credits: 4, disabled: true },
    { id: AIModel.PLAYGROUND, name: 'Playground 2.5', icon: ImageIcon, credits: 3, disabled: true }
  ];

  const aspectRatios = [
    { label: '1:1', width: 1024, height: 1024 },
    { label: '16:9', width: 1792, height: 1024 },
    { label: '9:16', width: 1024, height: 1792 },
    { label: '4:3', width: 1024, height: 768 },
    { label: '3:4', width: 768, height: 1024 }
  ];

  const qualityOptions = [
    { value: 'standard', label: 'Standard', description: 'Fast generation' },
    { value: 'hd', label: 'HD', description: 'Higher quality', credits: 2 },
    { value: 'ultra', label: 'Ultra', description: 'Maximum quality', credits: 3 }
  ];

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const model = models.find(m => m.id === selectedModel);
    if (!model) return;

    if (credits < model.credits) {
      toast.error('Insufficient credits');
      return;
    }

    setIsGenerating(true);
    
    try {
      const options: AIGenerationOptions = {
        model: selectedModel,
        prompt,
        negativePrompt,
        ...generationOptions,
        stylePreset: selectedStyle ? STYLE_PRESETS[selectedStyle] : undefined
      };

      const result = await aiService.generateImage(options);
      
      setRecentGenerations(prev => [result, ...prev].slice(0, 4));
      onImageGenerated(result);
      
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, negativePrompt, selectedModel, selectedStyle, generationOptions, credits, onImageGenerated]);

  const handleBatchGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    
    try {
      const options: AIGenerationOptions = {
        model: selectedModel,
        prompt,
        negativePrompt,
        ...generationOptions,
        stylePreset: selectedStyle ? STYLE_PRESETS[selectedStyle] : undefined
      };

      const results = await aiService.generateBatch(options, 4);
      
      results.forEach(result => {
        onImageGenerated(result);
      });
      
      setRecentGenerations(prev => [...results, ...prev].slice(0, 8));
      
      toast.success(`Generated ${results.length} images!`);
    } catch (error) {
      console.error('Batch generation error:', error);
      toast.error('Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, negativePrompt, selectedModel, selectedStyle, generationOptions, onImageGenerated]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                        backdrop-blur-xl border border-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Generation Studio</h2>
            <p className="text-sm text-white/60">Create amazing designs with AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-xl">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">{credits} Credits</span>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/80">AI Model</label>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {models.map((model) => {
            const Icon = model.icon;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                disabled={model.disabled}
                className={`
                  relative p-3 rounded-xl transition-all duration-200
                  ${selectedModel === model.id
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                  ${model.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  border backdrop-blur-xl
                `}
              >
                {model.badge && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium
                                 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                    {model.badge}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/80" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{model.name}</p>
                    <p className="text-xs text-white/60">{model.credits} credits</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/80">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full p-4 rounded-xl bg-white/5 border border-white/10 
                   text-white placeholder-white/40 backdrop-blur-xl resize-none
                   focus:outline-none focus:border-purple-400/50 transition-colors"
          rows={3}
        />
      </div>

      {/* Style Presets */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/80">Style Preset</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedStyle('')}
            className={`
              p-2 rounded-lg text-xs font-medium transition-all
              ${selectedStyle === ''
                ? 'bg-purple-500/30 border-purple-400/50 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }
              border backdrop-blur-xl
            `}
          >
            None
          </button>
          {Object.values(STYLE_PRESETS).slice(0, 7).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedStyle(preset.id)}
              className={`
                p-2 rounded-lg text-xs font-medium transition-all
                ${selectedStyle === preset.id
                  ? 'bg-purple-500/30 border-purple-400/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }
                border backdrop-blur-xl
              `}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white/80 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Advanced Settings
        </button>
        
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Negative Prompt */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Negative Prompt</label>
                <input
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Things to avoid..."
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10 
                           text-white placeholder-white/40 backdrop-blur-xl
                           focus:outline-none focus:border-purple-400/50 transition-colors text-sm"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Aspect Ratio</label>
                <div className="flex gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => setGenerationOptions(prev => ({
                        ...prev,
                        width: ratio.width,
                        height: ratio.height
                      }))}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${generationOptions.width === ratio.width && generationOptions.height === ratio.height
                          ? 'bg-purple-500/30 border-purple-400/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }
                        border backdrop-blur-xl
                      `}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setGenerationOptions(prev => ({ ...prev, quality: option.value as any }))}
                      className={`
                        p-2 rounded-lg transition-all
                        ${generationOptions.quality === option.value
                          ? 'bg-purple-500/30 border-purple-400/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                        border backdrop-blur-xl
                      `}
                    >
                      <p className="text-xs font-medium text-white">{option.label}</p>
                      <p className="text-xs text-white/40">{option.description}</p>
                      {option.credits && (
                        <p className="text-xs text-yellow-400">+{option.credits} credits</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation Steps (for SD models) */}
              {(selectedModel === AIModel.STABLE_DIFFUSION_XL || selectedModel === AIModel.STABLE_DIFFUSION_3) && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">
                    Steps: {generationOptions.steps}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={generationOptions.steps}
                    onChange={(e) => setGenerationOptions(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Enhance Prompt Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generationOptions.enhancePrompt}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, enhancePrompt: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 
                           focus:ring-purple-500 focus:ring-offset-0"
                />
                <span className="text-xs text-white/60">Auto-enhance prompt</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 
                   text-white font-medium transition-all duration-200
                   hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 
                   disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
        
        <button
          onClick={handleBatchGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20
                   text-white font-medium transition-all duration-200
                   hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
        >
          <Grid3x3 className="w-4 h-4" />
          Batch (4)
        </button>
      </div>

      {/* Recent Generations */}
      {recentGenerations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/80">Recent Generations</h3>
          <div className="grid grid-cols-4 gap-2">
            {recentGenerations.map((generation, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-white/10
                         hover:border-purple-400/50 transition-all cursor-pointer"
              >
                <img
                  src={generation.imageUrl}
                  alt={generation.prompt}
                  className="w-full h-20 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent 
                              opacity-0 group-hover:opacity-100 transition-opacity
                              flex items-end p-2">
                  <button className="p-1 rounded bg-white/20 backdrop-blur-xl">
                    <Download className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
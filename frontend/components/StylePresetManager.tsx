"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { LoadingDots } from './LoadingSkeletons'

interface StylePreset {
  id: string
  name: string
  description: string
  category: 'artistic' | 'photography' | 'logo' | 'character' | 'landscape' | 'product'
  tags: string[]
  promptAdditions: string
  thumbnail?: string
  isBuiltIn: boolean
  usageCount: number
  lastUsed?: Date
}

interface StylePresetManagerProps {
  onSelectPreset: (preset: StylePreset) => void
  selectedPresetId?: string
  className?: string
}

export const StylePresetManager = memo(({
  onSelectPreset,
  selectedPresetId,
  className = ''
}: StylePresetManagerProps) => {
  const [presets, setPresets] = useState<StylePreset[]>([])
  const [filteredPresets, setFilteredPresets] = useState<StylePreset[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Built-in style presets
  const builtInPresets: StylePreset[] = [
    {
      id: 'photorealistic',
      name: 'Photorealistic',
      description: 'Ultra-realistic photography style',
      category: 'photography',
      tags: ['realistic', 'photo', 'detailed'],
      promptAdditions: 'photorealistic, high quality, detailed, professional photography, sharp focus, 8K resolution',
      isBuiltIn: true,
      usageCount: 156,
      lastUsed: new Date('2024-01-10')
    },
    {
      id: 'digital_art',
      name: 'Digital Art',
      description: 'Modern digital artwork style',
      category: 'artistic',
      tags: ['digital', 'art', 'creative'],
      promptAdditions: 'digital art, concept art, detailed illustration, vibrant colors, professional artwork',
      isBuiltIn: true,
      usageCount: 89,
      lastUsed: new Date('2024-01-08')
    },
    {
      id: 'minimalist_logo',
      name: 'Minimalist Logo',
      description: 'Clean, simple logo design',
      category: 'logo',
      tags: ['minimalist', 'clean', 'business'],
      promptAdditions: 'minimalist design, clean lines, simple, professional logo, vector style, flat design',
      isBuiltIn: true,
      usageCount: 203,
      lastUsed: new Date('2024-01-12')
    },
    {
      id: 'anime_style',
      name: 'Anime Character',
      description: 'Japanese anime art style',
      category: 'character',
      tags: ['anime', 'character', 'manga'],
      promptAdditions: 'anime style, manga art, detailed character, vibrant colors, expressive eyes, clean lineart',
      isBuiltIn: true,
      usageCount: 142,
      lastUsed: new Date('2024-01-09')
    },
    {
      id: 'oil_painting',
      name: 'Oil Painting',
      description: 'Classic oil painting technique',
      category: 'artistic',
      tags: ['painting', 'classic', 'traditional'],
      promptAdditions: 'oil painting, brushstrokes, canvas texture, classical art style, rich colors, artistic masterpiece',
      isBuiltIn: true,
      usageCount: 67,
      lastUsed: new Date('2024-01-07')
    },
    {
      id: 'landscape_photo',
      name: 'Landscape Photography',
      description: 'Professional landscape shots',
      category: 'landscape',
      tags: ['landscape', 'nature', 'outdoor'],
      promptAdditions: 'landscape photography, golden hour lighting, wide angle, professional, National Geographic style, dramatic sky',
      isBuiltIn: true,
      usageCount: 98,
      lastUsed: new Date('2024-01-11')
    },
    {
      id: 'product_studio',
      name: 'Product Studio',
      description: 'Professional product photography',
      category: 'product',
      tags: ['product', 'commercial', 'clean'],
      promptAdditions: 'product photography, studio lighting, white background, commercial, professional, high quality, clean',
      isBuiltIn: true,
      usageCount: 134,
      lastUsed: new Date('2024-01-10')
    },
    {
      id: 'watercolor',
      name: 'Watercolor Art',
      description: 'Soft watercolor painting style',
      category: 'artistic',
      tags: ['watercolor', 'soft', 'artistic'],
      promptAdditions: 'watercolor painting, soft colors, flowing paint, artistic, delicate brushwork, paper texture',
      isBuiltIn: true,
      usageCount: 45,
      lastUsed: new Date('2024-01-06')
    }
  ]

  const categories = [
    { id: 'all', name: 'All Styles', icon: '🎨', count: 0 },
    { id: 'artistic', name: 'Artistic', icon: '🖼️', count: 0 },
    { id: 'photography', name: 'Photography', icon: '📸', count: 0 },
    { id: 'logo', name: 'Logo Design', icon: '🏷️', count: 0 },
    { id: 'character', name: 'Character', icon: '👤', count: 0 },
    { id: 'landscape', name: 'Landscape', icon: '🏔️', count: 0 },
    { id: 'product', name: 'Product', icon: '📦', count: 0 }
  ]

  // Load presets from localStorage and merge with built-ins
  const loadPresets = useCallback(() => {
    setIsLoading(true)
    
    try {
      const customPresetsJson = localStorage.getItem('flowbotz_style_presets')
      const customPresets: StylePreset[] = customPresetsJson ? JSON.parse(customPresetsJson) : []
      
      // Merge built-in and custom presets
      const allPresets = [...builtInPresets, ...customPresets].sort((a, b) => b.usageCount - a.usageCount)
      
      setPresets(allPresets)
      setFilteredPresets(allPresets)
    } catch (error) {
      console.error('Error loading presets:', error)
      setPresets(builtInPresets)
      setFilteredPresets(builtInPresets)
    }
    
    setIsLoading(false)
  }, [])

  // Filter presets based on category and search
  const filterPresets = useCallback(() => {
    let filtered = presets

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(preset => preset.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredPresets(filtered)
  }, [presets, selectedCategory, searchQuery])

  // Save custom presets to localStorage
  const saveCustomPresets = useCallback((newPresets: StylePreset[]) => {
    const customPresets = newPresets.filter(preset => !preset.isBuiltIn)
    try {
      localStorage.setItem('flowbotz_style_presets', JSON.stringify(customPresets))
    } catch (error) {
      console.error('Error saving presets:', error)
    }
  }, [])

  // Handle preset selection and update usage
  const handleSelectPreset = useCallback((preset: StylePreset) => {
    // Update usage count and last used
    const updatedPresets = presets.map(p => 
      p.id === preset.id 
        ? { ...p, usageCount: p.usageCount + 1, lastUsed: new Date() }
        : p
    )
    
    setPresets(updatedPresets)
    saveCustomPresets(updatedPresets)
    onSelectPreset({ ...preset, usageCount: preset.usageCount + 1, lastUsed: new Date() })
  }, [presets, saveCustomPresets, onSelectPreset])

  // Create new custom preset
  const createCustomPreset = useCallback((presetData: Omit<StylePreset, 'id' | 'isBuiltIn' | 'usageCount'>) => {
    const newPreset: StylePreset = {
      ...presetData,
      id: `custom_${Date.now()}`,
      isBuiltIn: false,
      usageCount: 0,
      lastUsed: new Date()
    }
    
    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    saveCustomPresets(updatedPresets)
    setShowCreateModal(false)
  }, [presets, saveCustomPresets])

  // Delete custom preset
  const deletePreset = useCallback((presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = presets.filter(p => p.id !== presetId)
      setPresets(updatedPresets)
      saveCustomPresets(updatedPresets)
    }
  }, [presets, saveCustomPresets])

  // Update category counts
  const updateCategoryCounts = useCallback(() => {
    return categories.map(category => ({
      ...category,
      count: category.id === 'all' 
        ? presets.length 
        : presets.filter(p => p.category === category.id).length
    }))
  }, [presets])

  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  useEffect(() => {
    filterPresets()
  }, [filterPresets])

  const categoriesWithCounts = updateCategoryCounts()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🎭 Style Presets
          </h3>
          <p className="text-sm text-white/60">
            Apply professional styles to enhance your prompts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="cosmic-button cosmic-button-secondary cosmic-button-sm"
        >
          + Create Preset
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets..."
            className="w-full px-4 py-2 pl-10 cosmic-input"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
            🔍
          </span>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          {categoriesWithCounts.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                selectedCategory === category.id
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
              <span className="text-xs opacity-60">({category.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Presets Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <LoadingDots size="md" />
          <p className="text-white/60 text-sm mt-3">Loading style presets...</p>
        </div>
      ) : filteredPresets.length === 0 ? (
        <div className="text-center py-12 cosmic-card">
          <span className="text-4xl block mb-3">🎨</span>
          <h3 className="text-lg font-medium text-white mb-2">No presets found</h3>
          <p className="text-white/60 text-sm">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first custom preset to get started'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className={`cosmic-card p-4 cursor-pointer transition-all duration-200 group ${
                selectedPresetId === preset.id
                  ? 'ring-2 ring-purple-500/50 bg-purple-500/10'
                  : 'hover:bg-white/5'
              }`}
              onClick={() => handleSelectPreset(preset)}
            >
              {/* Preset Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm mb-1 flex items-center gap-2">
                    <span className="capitalize">{preset.name}</span>
                    {preset.isBuiltIn && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                        Built-in
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-white/60 line-clamp-2">
                    {preset.description}
                  </p>
                </div>
                
                {!preset.isBuiltIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePreset(preset.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 transition-opacity"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Tags */}
              <div className="flex gap-1 flex-wrap mb-3">
                {preset.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-white/10 text-white/70 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {preset.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-white/10 text-white/70 rounded">
                    +{preset.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Usage Stats */}
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Used {preset.usageCount} times</span>
                {preset.lastUsed && (
                  <span>
                    Last: {preset.lastUsed.toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedPresetId === preset.id && (
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-300">
                  <span>✓</span>
                  <span>Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Preset Modal */}
      {showCreateModal && (
        <CreatePresetModal
          onSave={createCustomPreset}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
})

StylePresetManager.displayName = 'StylePresetManager'

// Create Preset Modal Component
interface CreatePresetModalProps {
  onSave: (preset: Omit<StylePreset, 'id' | 'isBuiltIn' | 'usageCount'>) => void
  onClose: () => void
}

const CreatePresetModal = memo(({ onSave, onClose }: CreatePresetModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'artistic' as StylePreset['category'],
    tags: '',
    promptAdditions: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.promptAdditions.trim()) {
      alert('Please fill in the required fields')
      return
    }

    const preset = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      lastUsed: new Date()
    }

    onSave(preset)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="cosmic-card-premium max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Create Style Preset</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full cosmic-input"
              placeholder="e.g., Vintage Portrait"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full cosmic-input"
              rows={2}
              placeholder="Brief description of this style..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as StylePreset['category'] }))}
              className="w-full cosmic-input"
            >
              <option value="artistic">Artistic</option>
              <option value="photography">Photography</option>
              <option value="logo">Logo Design</option>
              <option value="character">Character</option>
              <option value="landscape">Landscape</option>
              <option value="product">Product</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full cosmic-input"
              placeholder="vintage, portrait, warm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Prompt Additions *
            </label>
            <textarea
              value={formData.promptAdditions}
              onChange={(e) => setFormData(prev => ({ ...prev, promptAdditions: e.target.value }))}
              className="w-full cosmic-input"
              rows={3}
              placeholder="vintage style, warm lighting, film grain, nostalgic mood"
              required
            />
            <p className="text-xs text-white/50 mt-1">
              These keywords will be added to prompts when this preset is selected
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 cosmic-button cosmic-button-primary cosmic-button-md"
            >
              Create Preset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

CreatePresetModal.displayName = 'CreatePresetModal'
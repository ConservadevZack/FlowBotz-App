"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { LoadingDots } from './LoadingSkeletons'

interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'logo' | 'character' | 'product' | 'landscape' | 'portrait' | 'abstract' | 'business'
  template: string
  placeholders: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  usageCount: number
  likes: number
  isBuiltIn: boolean
  author?: string
  examples?: string[]
}

interface PromptTemplatesProps {
  onSelectTemplate: (template: PromptTemplate) => void
  onCustomizeTemplate: (template: string) => void
  className?: string
}

export const PromptTemplates = memo(({
  onSelectTemplate,
  onCustomizeTemplate,
  className = ''
}: PromptTemplatesProps) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<PromptTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  // Built-in prompt templates
  const builtInTemplates: PromptTemplate[] = [
    {
      id: 'logo_business',
      name: 'Professional Business Logo',
      description: 'Clean, corporate logo design template',
      category: 'logo',
      template: 'minimalist logo design for [COMPANY_NAME], [INDUSTRY] business, [COLOR_SCHEME] colors, clean typography, professional, vector style, simple geometric shapes, scalable design',
      placeholders: ['COMPANY_NAME', 'INDUSTRY', 'COLOR_SCHEME'],
      difficulty: 'beginner',
      tags: ['business', 'professional', 'minimalist', 'corporate'],
      usageCount: 234,
      likes: 89,
      isBuiltIn: true,
      examples: [
        'minimalist logo design for TechFlow, software development business, blue and white colors',
        'minimalist logo design for GreenLeaf, organic food business, green and brown colors'
      ]
    },
    {
      id: 'character_fantasy',
      name: 'Fantasy Character Portrait',
      description: 'Detailed fantasy character with magical elements',
      category: 'character',
      template: '[CHARACTER_TYPE] [GENDER], [AGE] years old, [HAIR_COLOR] hair, [EYE_COLOR] eyes, wearing [CLOTHING_STYLE], [MAGICAL_ELEMENT], fantasy art style, detailed character design, dramatic lighting, high quality digital art',
      placeholders: ['CHARACTER_TYPE', 'GENDER', 'AGE', 'HAIR_COLOR', 'EYE_COLOR', 'CLOTHING_STYLE', 'MAGICAL_ELEMENT'],
      difficulty: 'intermediate',
      tags: ['fantasy', 'character', 'magic', 'portrait'],
      usageCount: 156,
      likes: 124,
      isBuiltIn: true,
      examples: [
        'elven mage female, 25 years old, silver hair, blue eyes, wearing mystical robes, glowing staff',
        'dwarf warrior male, 40 years old, red beard, green eyes, wearing armor, enchanted axe'
      ]
    },
    {
      id: 'product_showcase',
      name: 'Product Photography',
      description: 'Professional product shot with studio lighting',
      category: 'product',
      template: '[PRODUCT_NAME] [PRODUCT_TYPE], [COLOR] color, professional product photography, studio lighting, white background, commercial photography, high resolution, detailed, clean composition, marketing photo',
      placeholders: ['PRODUCT_NAME', 'PRODUCT_TYPE', 'COLOR'],
      difficulty: 'beginner',
      tags: ['product', 'commercial', 'studio', 'marketing'],
      usageCount: 189,
      likes: 67,
      isBuiltIn: true,
      examples: [
        'iPhone 15 smartphone, space black color, professional product photography',
        'Nike Air Max sneakers, white and blue color, professional product photography'
      ]
    },
    {
      id: 'landscape_nature',
      name: 'Scenic Landscape',
      description: 'Breathtaking natural landscape photography',
      category: 'landscape',
      template: '[LOCATION] landscape, [TIME_OF_DAY], [WEATHER_CONDITION], [SEASON], [VEGETATION], dramatic sky, [LIGHTING_TYPE] lighting, wide angle shot, high quality nature photography, detailed, cinematic composition',
      placeholders: ['LOCATION', 'TIME_OF_DAY', 'WEATHER_CONDITION', 'SEASON', 'VEGETATION', 'LIGHTING_TYPE'],
      difficulty: 'intermediate',
      tags: ['landscape', 'nature', 'photography', 'outdoor'],
      usageCount: 143,
      likes: 98,
      isBuiltIn: true,
      examples: [
        'mountain valley landscape, golden hour, clear skies, autumn, colorful trees, warm lighting',
        'ocean coastline landscape, sunrise, misty, spring, tropical palms, soft lighting'
      ]
    },
    {
      id: 'portrait_professional',
      name: 'Professional Headshot',
      description: 'Corporate headshot with professional lighting',
      category: 'portrait',
      template: 'professional headshot of [PROFESSION] [GENDER], [AGE] years old, [ETHNICITY], wearing [ATTIRE], [EXPRESSION], studio lighting, neutral background, high quality portrait photography, business professional',
      placeholders: ['PROFESSION', 'GENDER', 'AGE', 'ETHNICITY', 'ATTIRE', 'EXPRESSION'],
      difficulty: 'beginner',
      tags: ['portrait', 'professional', 'business', 'headshot'],
      usageCount: 201,
      likes: 76,
      isBuiltIn: true,
      examples: [
        'professional headshot of business executive male, 35 years old, caucasian, wearing suit, confident smile',
        'professional headshot of doctor female, 28 years old, asian, wearing lab coat, friendly expression'
      ]
    },
    {
      id: 'abstract_modern',
      name: 'Modern Abstract Art',
      description: 'Contemporary abstract composition',
      category: 'abstract',
      template: 'abstract [STYLE] art, [COLOR_PALETTE] color palette, [PATTERN_TYPE] patterns, [TEXTURE] texture, [MOOD] mood, modern contemporary style, digital art, high resolution, artistic composition',
      placeholders: ['STYLE', 'COLOR_PALETTE', 'PATTERN_TYPE', 'TEXTURE', 'MOOD'],
      difficulty: 'advanced',
      tags: ['abstract', 'modern', 'contemporary', 'artistic'],
      usageCount: 87,
      likes: 112,
      isBuiltIn: true,
      examples: [
        'abstract geometric art, vibrant rainbow color palette, triangular patterns, smooth texture, energetic mood',
        'abstract fluid art, pastel pink and blue color palette, flowing patterns, soft texture, calm mood'
      ]
    },
    {
      id: 'business_infographic',
      name: 'Business Infographic',
      description: 'Professional data visualization design',
      category: 'business',
      template: '[INFOGRAPHIC_TYPE] infographic about [TOPIC], [DATA_TYPE] data visualization, [COLOR_SCHEME] corporate colors, clean modern design, professional layout, charts and graphs, business style, informative',
      placeholders: ['INFOGRAPHIC_TYPE', 'TOPIC', 'DATA_TYPE', 'COLOR_SCHEME'],
      difficulty: 'intermediate',
      tags: ['business', 'infographic', 'data', 'corporate'],
      usageCount: 124,
      likes: 54,
      isBuiltIn: true,
      examples: [
        'financial infographic about quarterly earnings, bar chart data visualization, blue and white corporate colors',
        'process infographic about workflow optimization, flowchart data visualization, green and gray corporate colors'
      ]
    }
  ]

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📋', count: 0 },
    { id: 'logo', name: 'Logo Design', icon: '🏷️', count: 0 },
    { id: 'character', name: 'Characters', icon: '👤', count: 0 },
    { id: 'product', name: 'Products', icon: '📦', count: 0 },
    { id: 'landscape', name: 'Landscapes', icon: '🏔️', count: 0 },
    { id: 'portrait', name: 'Portraits', icon: '🎭', count: 0 },
    { id: 'abstract', name: 'Abstract', icon: '🎨', count: 0 },
    { id: 'business', name: 'Business', icon: '💼', count: 0 }
  ]

  const difficultyLevels = [
    { id: 'all', name: 'All Levels', count: 0 },
    { id: 'beginner', name: 'Beginner', count: 0 },
    { id: 'intermediate', name: 'Intermediate', count: 0 },
    { id: 'advanced', name: 'Advanced', count: 0 }
  ]

  // Load templates
  const loadTemplates = useCallback(() => {
    setIsLoading(true)
    
    try {
      const customTemplatesJson = localStorage.getItem('flowbotz_prompt_templates')
      const customTemplates: PromptTemplate[] = customTemplatesJson ? JSON.parse(customTemplatesJson) : []
      
      const allTemplates = [...builtInTemplates, ...customTemplates].sort((a, b) => b.usageCount - a.usageCount)
      
      setTemplates(allTemplates)
      setFilteredTemplates(allTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates(builtInTemplates)
      setFilteredTemplates(builtInTemplates)
    }
    
    setIsLoading(false)
  }, [])

  // Filter templates
  const filterTemplates = useCallback(() => {
    let filtered = templates

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, selectedCategory, selectedDifficulty, searchQuery])

  // Update template usage
  const handleSelectTemplate = useCallback((template: PromptTemplate) => {
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1 }
        : t
    )
    
    setTemplates(updatedTemplates)
    
    // Save custom templates to localStorage
    const customTemplates = updatedTemplates.filter(t => !t.isBuiltIn)
    try {
      localStorage.setItem('flowbotz_prompt_templates', JSON.stringify(customTemplates))
    } catch (error) {
      console.error('Error saving templates:', error)
    }
    
    onSelectTemplate({ ...template, usageCount: template.usageCount + 1 })
  }, [templates, onSelectTemplate])

  // Fill template with example values
  const fillTemplateExample = useCallback((template: PromptTemplate) => {
    if (template.examples && template.examples.length > 0) {
      const randomExample = template.examples[Math.floor(Math.random() * template.examples.length)]
      onCustomizeTemplate(randomExample)
    } else {
      // Generate a basic filled template
      let filled = template.template
      template.placeholders.forEach(placeholder => {
        filled = filled.replace(`[${placeholder}]`, `[${placeholder.toLowerCase()}]`)
      })
      onCustomizeTemplate(filled)
    }
  }, [onCustomizeTemplate])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    filterTemplates()
  }, [filterTemplates])

  const categoriesWithCounts = categories.map(category => ({
    ...category,
    count: category.id === 'all' 
      ? templates.length 
      : templates.filter(t => t.category === category.id).length
  }))

  const difficultyWithCounts = difficultyLevels.map(level => ({
    ...level,
    count: level.id === 'all' 
      ? templates.length 
      : templates.filter(t => t.difficulty === level.id).length
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          📝 Prompt Templates
        </h3>
        <p className="text-sm text-white/60">
          Pre-built templates to jumpstart your AI generation
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 pl-10 cosmic-input"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
            🔍
          </span>
        </div>

        {/* Filter Row */}
        <div className="flex gap-4 flex-wrap">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categoriesWithCounts.slice(0, 4).map((category) => (
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

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="cosmic-input text-sm min-w-[140px]"
          >
            {difficultyWithCounts.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name} ({level.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <LoadingDots size="md" />
          <p className="text-white/60 text-sm mt-3">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 cosmic-card">
          <span className="text-4xl block mb-3">📝</span>
          <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
          <p className="text-white/60 text-sm">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="cosmic-card p-4 space-y-3">
              {/* Template Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{template.name}</h4>
                    
                    {/* Difficulty Badge */}
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.difficulty === 'beginner' 
                        ? 'bg-green-500/20 text-green-300'
                        : template.difficulty === 'intermediate'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {template.difficulty}
                    </span>
                    
                    {template.isBuiltIn && (
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                        Built-in
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-white/60 mb-3">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-white/10 text-white/70 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right text-xs text-white/50">
                  <div>👤 {template.usageCount} uses</div>
                  <div>❤️ {template.likes} likes</div>
                </div>
              </div>

              {/* Template Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">Template:</span>
                  <button
                    onClick={() => setExpandedTemplate(
                      expandedTemplate === template.id ? null : template.id
                    )}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    {expandedTemplate === template.id ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                
                <div className={`cosmic-card p-3 bg-white/5 ${
                  expandedTemplate === template.id ? '' : 'max-h-20 overflow-hidden'
                }`}>
                  <code className="text-sm text-white/80 font-mono">
                    {template.template}
                  </code>
                </div>

                {/* Placeholders */}
                <div className="text-xs text-white/60">
                  <strong>Placeholders:</strong> {template.placeholders.join(', ')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSelectTemplate(template)}
                  className="cosmic-button cosmic-button-primary cosmic-button-sm flex-1"
                >
                  Use Template
                </button>
                <button
                  onClick={() => fillTemplateExample(template)}
                  className="cosmic-button cosmic-button-secondary cosmic-button-sm"
                >
                  Try Example
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

PromptTemplates.displayName = 'PromptTemplates'
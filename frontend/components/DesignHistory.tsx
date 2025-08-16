"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { LoadingDots } from './LoadingSkeletons'

interface DesignVersion {
  id: string
  designId: string
  version: number
  prompt: string
  model: string
  imageUrl: string
  thumbnail: string
  createdAt: Date
  settings: {
    style?: string
    dimensions?: string
    quality?: string
    seed?: number
  }
  metadata: {
    generationTime: number
    creditsUsed: number
    likes: number
    downloads: number
  }
  tags: string[]
  isPublic: boolean
  parentVersionId?: string
  changes?: string[]
}

interface DesignProject {
  id: string
  name: string
  description: string
  category: string
  versions: DesignVersion[]
  currentVersionId: string
  createdAt: Date
  updatedAt: Date
  collaborators: string[]
  isPublic: boolean
  forkCount: number
  starCount: number
  status: 'draft' | 'published' | 'archived'
}

interface DesignHistoryProps {
  projectId?: string
  onVersionSelect: (version: DesignVersion) => void
  onCreateFork: (version: DesignVersion) => void
  className?: string
}

export const DesignHistory = memo(({
  projectId,
  onVersionSelect,
  onCreateFork,
  className = ''
}: DesignHistoryProps) => {
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<DesignVersion | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'tree'>('grid')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'version'>('date')
  const [isLoading, setIsLoading] = useState(true)
  const [showCompare, setShowCompare] = useState(false)
  const [compareVersions, setCompareVersions] = useState<DesignVersion[]>([])

  // Mock data - in a real app, this would come from an API
  const mockProjects: DesignProject[] = [
    {
      id: 'proj_1',
      name: 'Logo Exploration',
      description: 'Corporate logo design iterations',
      category: 'logo',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      collaborators: ['user_1'],
      isPublic: true,
      forkCount: 3,
      starCount: 12,
      status: 'published',
      currentVersionId: 'v_1_3',
      versions: [
        {
          id: 'v_1_1',
          designId: 'design_1',
          version: 1,
          prompt: 'minimalist tech company logo, blue and white',
          model: 'dall-e-3',
          imageUrl: 'https://picsum.photos/512/512?random=101',
          thumbnail: 'https://picsum.photos/256/256?random=101',
          createdAt: new Date('2024-01-01'),
          settings: { style: 'minimalist', dimensions: '512x512', quality: 'high', seed: 12345 },
          metadata: { generationTime: 8.5, creditsUsed: 4, likes: 5, downloads: 2 },
          tags: ['logo', 'tech', 'minimal'],
          isPublic: true
        },
        {
          id: 'v_1_2',
          designId: 'design_1',
          version: 2,
          prompt: 'minimalist tech company logo, blue and white, geometric shapes',
          model: 'dall-e-3',
          imageUrl: 'https://picsum.photos/512/512?random=102',
          thumbnail: 'https://picsum.photos/256/256?random=102',
          createdAt: new Date('2024-01-08'),
          settings: { style: 'minimalist', dimensions: '512x512', quality: 'high', seed: 23456 },
          metadata: { generationTime: 7.2, creditsUsed: 4, likes: 8, downloads: 5 },
          tags: ['logo', 'tech', 'geometric'],
          isPublic: true,
          parentVersionId: 'v_1_1',
          changes: ['Added geometric shapes', 'Refined composition']
        },
        {
          id: 'v_1_3',
          designId: 'design_1',
          version: 3,
          prompt: 'minimalist tech company logo, blue and white, geometric shapes, professional',
          model: 'dall-e-3',
          imageUrl: 'https://picsum.photos/512/512?random=103',
          thumbnail: 'https://picsum.photos/256/256?random=103',
          createdAt: new Date('2024-01-15'),
          settings: { style: 'minimalist', dimensions: '512x512', quality: 'high', seed: 34567 },
          metadata: { generationTime: 6.8, creditsUsed: 4, likes: 15, downloads: 12 },
          tags: ['logo', 'tech', 'professional'],
          isPublic: true,
          parentVersionId: 'v_1_2',
          changes: ['Enhanced professionalism', 'Better typography integration']
        }
      ]
    },
    {
      id: 'proj_2',
      name: 'Character Designs',
      description: 'Fantasy character concept art',
      category: 'character',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-20'),
      collaborators: ['user_1'],
      isPublic: false,
      forkCount: 0,
      starCount: 3,
      status: 'draft',
      currentVersionId: 'v_2_2',
      versions: [
        {
          id: 'v_2_1',
          designId: 'design_2',
          version: 1,
          prompt: 'fantasy elf warrior, detailed armor, forest background',
          model: 'stability-ai',
          imageUrl: 'https://picsum.photos/512/512?random=201',
          thumbnail: 'https://picsum.photos/256/256?random=201',
          createdAt: new Date('2024-01-10'),
          settings: { style: 'fantasy', dimensions: '512x768', quality: 'medium', seed: 45678 },
          metadata: { generationTime: 4.2, creditsUsed: 2, likes: 2, downloads: 0 },
          tags: ['character', 'elf', 'warrior'],
          isPublic: false
        },
        {
          id: 'v_2_2',
          designId: 'design_2',
          version: 2,
          prompt: 'fantasy elf warrior, detailed armor, forest background, magical aura',
          model: 'stability-ai',
          imageUrl: 'https://picsum.photos/512/512?random=202',
          thumbnail: 'https://picsum.photos/256/256?random=202',
          createdAt: new Date('2024-01-20'),
          settings: { style: 'fantasy', dimensions: '512x768', quality: 'high', seed: 56789 },
          metadata: { generationTime: 5.1, creditsUsed: 3, likes: 3, downloads: 1 },
          tags: ['character', 'elf', 'magic'],
          isPublic: false,
          parentVersionId: 'v_2_1',
          changes: ['Added magical aura', 'Improved lighting']
        }
      ]
    }
  ]

  const categories = [
    { id: 'all', name: 'All Categories', count: 0 },
    { id: 'logo', name: 'Logos', count: 0 },
    { id: 'character', name: 'Characters', count: 0 },
    { id: 'product', name: 'Products', count: 0 },
    { id: 'landscape', name: 'Landscapes', count: 0 }
  ]

  // Load projects
  const loadProjects = useCallback(() => {
    setIsLoading(true)
    
    // In a real app, this would be an API call
    setTimeout(() => {
      setProjects(mockProjects)
      if (projectId) {
        const project = mockProjects.find(p => p.id === projectId)
        setSelectedProject(project || null)
      }
      setIsLoading(false)
    }, 1000)
  }, [projectId])

  // Sort versions
  const sortVersions = useCallback((versions: DesignVersion[], sortBy: string) => {
    return [...versions].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime()
        case 'popularity':
          return (b.metadata.likes + b.metadata.downloads) - (a.metadata.likes + a.metadata.downloads)
        case 'version':
          return b.version - a.version
        default:
          return 0
      }
    })
  }, [])

  // Handle version selection
  const handleVersionSelect = useCallback((version: DesignVersion) => {
    setSelectedVersion(version)
    onVersionSelect(version)
  }, [onVersionSelect])

  // Toggle version comparison
  const toggleVersionCompare = useCallback((version: DesignVersion) => {
    setCompareVersions(prev => {
      const exists = prev.find(v => v.id === version.id)
      if (exists) {
        return prev.filter(v => v.id !== version.id)
      } else if (prev.length < 3) {
        return [...prev, version]
      } else {
        return [prev[1], prev[2], version] // Keep last 2 and add new one
      }
    })
  }, [])

  // Create fork from version
  const handleCreateFork = useCallback((version: DesignVersion) => {
    onCreateFork(version)
  }, [onCreateFork])

  // Generate version tree data
  const generateVersionTree = useCallback((versions: DesignVersion[]) => {
    const tree: { [key: string]: DesignVersion & { children: DesignVersion[] } } = {}
    const roots: DesignVersion[] = []

    // First pass: create nodes
    versions.forEach(version => {
      tree[version.id] = { ...version, children: [] }
    })

    // Second pass: build tree structure
    versions.forEach(version => {
      if (version.parentVersionId && tree[version.parentVersionId]) {
        tree[version.parentVersionId].children.push(version)
      } else {
        roots.push(version)
      }
    })

    return { tree, roots }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const categoriesWithCounts = categories.map(cat => ({
    ...cat,
    count: cat.id === 'all' ? projects.length : projects.filter(p => p.category === cat.id).length
  }))

  if (isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <LoadingDots size="md" />
        <p className="text-white/60 text-sm mt-3">Loading design history...</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📚 Design History
          </h3>
          <p className="text-sm text-white/60">
            Track versions and evolution of your designs
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          {(['grid', 'timeline', 'tree'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded text-sm capitalize transition-all ${
                viewMode === mode
                  ? 'bg-purple-500/30 text-purple-200'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {mode === 'grid' ? '⊞' : mode === 'timeline' ? '📈' : '🌳'} {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex gap-4 flex-wrap items-center">
        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="cosmic-input text-sm min-w-[150px]"
        >
          {categoriesWithCounts.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="cosmic-input text-sm min-w-[120px]"
        >
          <option value="date">Latest First</option>
          <option value="popularity">Most Popular</option>
          <option value="version">Version Number</option>
        </select>

        {/* Compare Mode */}
        {selectedProject && (
          <button
            onClick={() => setShowCompare(!showCompare)}
            className={`cosmic-button cosmic-button-sm ${
              showCompare ? 'cosmic-button-primary' : 'cosmic-button-secondary'
            }`}
          >
            {showCompare ? '✓' : '⚖️'} Compare ({compareVersions.length})
          </button>
        )}
      </div>

      {/* Project List or Selected Project */}
      {!selectedProject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects
            .filter(project => filterCategory === 'all' || project.category === filterCategory)
            .map((project) => (
              <div
                key={project.id}
                className="cosmic-card p-4 cursor-pointer hover:bg-white/5 transition-all"
                onClick={() => setSelectedProject(project)}
              >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white mb-1 flex items-center gap-2">
                      {project.name}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        project.status === 'published' ? 'bg-green-500/20 text-green-300' :
                        project.status === 'draft' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {project.status}
                      </span>
                    </h4>
                    <p className="text-sm text-white/60 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  
                  {project.isPublic && (
                    <div className="text-right text-xs text-white/50">
                      <div>⭐ {project.starCount}</div>
                      <div>🍴 {project.forkCount}</div>
                    </div>
                  )}
                </div>

                {/* Version Thumbnails */}
                <div className="flex gap-1 mb-3 overflow-hidden">
                  {project.versions.slice(-4).map((version, index) => (
                    <div
                      key={version.id}
                      className="w-12 h-12 rounded bg-white/10 overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={version.thumbnail}
                        alt={`Version ${version.version}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {project.versions.length > 4 && (
                    <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-white/40 text-xs">
                      +{project.versions.length - 4}
                    </div>
                  )}
                </div>

                {/* Project Stats */}
                <div className="flex justify-between text-xs text-white/50">
                  <span>{project.versions.length} versions</span>
                  <span>Updated {project.updatedAt.toLocaleDateString()}</span>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedProject(null)}
              className="text-white/60 hover:text-white"
            >
              ← Back
            </button>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
              <p className="text-white/60">{selectedProject.description}</p>
            </div>
          </div>

          {/* Compare Mode */}
          {showCompare && compareVersions.length > 0 && (
            <div className="cosmic-card p-4 space-y-4">
              <h4 className="font-medium text-white flex items-center gap-2">
                ⚖️ Version Comparison
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {compareVersions.map((version) => (
                  <div key={version.id} className="space-y-3">
                    <div className="aspect-square bg-white/5 rounded-lg overflow-hidden">
                      <img
                        src={version.imageUrl}
                        alt={`Version ${version.version}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-white mb-1">
                        Version {version.version}
                      </div>
                      <div className="text-white/60 text-xs space-y-1">
                        <div>Model: {version.model}</div>
                        <div>Likes: {version.metadata.likes}</div>
                        <div>Credits: {version.metadata.creditsUsed}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleVersionCompare(version)}
                      className="w-full cosmic-button cosmic-button-secondary cosmic-button-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Display */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortVersions(selectedProject.versions, sortBy).map((version) => (
                <div
                  key={version.id}
                  className={`cosmic-card p-3 cursor-pointer transition-all ${
                    selectedVersion?.id === version.id ? 'ring-2 ring-purple-500/50' : ''
                  } ${showCompare && compareVersions.find(v => v.id === version.id) ? 'ring-2 ring-yellow-500/50' : ''}`}
                  onClick={() => handleVersionSelect(version)}
                >
                  {/* Version Image */}
                  <div className="aspect-square bg-white/5 rounded-lg overflow-hidden mb-3">
                    <img
                      src={version.imageUrl}
                      alt={`Version ${version.version}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Version Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-sm">
                        v{version.version}
                      </span>
                      <span className="text-xs text-white/60">
                        {version.model}
                      </span>
                    </div>

                    <div className="text-xs text-white/60 line-clamp-2">
                      {version.prompt}
                    </div>

                    {/* Changes */}
                    {version.changes && version.changes.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-green-400">Changes:</div>
                        <div className="text-xs text-white/60">
                          {version.changes.slice(0, 2).map((change, index) => (
                            <div key={index}>• {change}</div>
                          ))}
                          {version.changes.length > 2 && (
                            <div>+{version.changes.length - 2} more...</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex justify-between text-xs text-white/50">
                      <span>❤️ {version.metadata.likes}</span>
                      <span>⬇️ {version.metadata.downloads}</span>
                      <span>💳 {version.metadata.creditsUsed}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 pt-2">
                      {showCompare && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleVersionCompare(version)
                          }}
                          className={`flex-1 text-xs py-1 rounded transition-all ${
                            compareVersions.find(v => v.id === version.id)
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {compareVersions.find(v => v.id === version.id) ? '✓' : '+'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateFork(version)
                        }}
                        className="flex-1 text-xs py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
                      >
                        Fork
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'timeline' && (
            <div className="space-y-4">
              {sortVersions(selectedProject.versions, 'date').map((version, index) => (
                <div key={version.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      version.id === selectedProject.currentVersionId 
                        ? 'bg-green-500' 
                        : 'bg-purple-500'
                    }`} />
                    {index < selectedProject.versions.length - 1 && (
                      <div className="w-px h-16 bg-white/20 mt-2" />
                    )}
                  </div>

                  {/* Version Content */}
                  <div className="flex-1 cosmic-card p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={version.thumbnail}
                          alt={`Version ${version.version}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">
                            Version {version.version}
                            {version.id === selectedProject.currentVersionId && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded">
                                Current
                              </span>
                            )}
                          </h4>
                          <span className="text-xs text-white/60">
                            {version.createdAt.toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-sm text-white/70">{version.prompt}</p>

                        {version.changes && (
                          <div className="text-sm text-green-400">
                            <div className="font-medium mb-1">Changes:</div>
                            <ul className="text-white/60 space-y-1">
                              {version.changes.map((change, i) => (
                                <li key={i}>• {change}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-4 text-xs text-white/50">
                          <span>Model: {version.model}</span>
                          <span>Credits: {version.metadata.creditsUsed}</span>
                          <span>Time: {version.metadata.generationTime}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'tree' && (
            <div className="cosmic-card p-6">
              <div className="text-center text-white/60">
                <div className="text-4xl mb-3">🌳</div>
                <h4 className="font-medium text-white mb-2">Version Tree View</h4>
                <p className="text-sm">
                  Interactive version tree visualization coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

DesignHistory.displayName = 'DesignHistory'
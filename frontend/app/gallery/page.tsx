"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import FloatingNavbar from '@/components/FloatingNavbar'

interface Design {
  id: string
  title: string
  prompt: string
  imageUrl: string
  model: string
  style: string
  createdAt: string
  tags: string[]
  isLiked: boolean
  likes: number
  downloads: number
}

export default function GalleryPage() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedSort, setSelectedSort] = useState('recent')
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')

  const filters = [
    { id: 'all', name: 'All Designs', count: 0 },
    { id: 'photorealistic', name: 'Photorealistic', count: 0 },
    { id: 'artistic', name: 'Artistic', count: 0 },
    { id: 'minimalist', name: 'Minimalist', count: 0 },
    { id: 'vintage', name: 'Vintage', count: 0 },
    { id: 'abstract', name: 'Abstract', count: 0 }
  ]

  const sortOptions = [
    { id: 'recent', name: 'Most Recent' },
    { id: 'popular', name: 'Most Popular' },
    { id: 'liked', name: 'Most Liked' },
    { id: 'downloads', name: 'Most Downloaded' }
  ]

  // Mock data - in real app this would come from API
  useEffect(() => {
    const mockDesigns: Design[] = [
      {
        id: '1',
        title: 'Cosmic Wolf Nebula',
        prompt: 'A majestic cosmic wolf howling at nebula stars, digital art style',
        imageUrl: 'https://picsum.photos/400/400?random=1',
        model: 'flux-kontext',
        style: 'photorealistic',
        createdAt: '2024-01-15T10:30:00Z',
        tags: ['wolf', 'cosmic', 'nebula', 'space'],
        isLiked: true,
        likes: 124,
        downloads: 87
      },
      {
        id: '2',
        title: 'Abstract Geometric Flow',
        prompt: 'Flowing geometric patterns in purple and blue gradients',
        imageUrl: 'https://picsum.photos/400/600?random=2',
        model: 'sd35',
        style: 'abstract',
        createdAt: '2024-01-14T15:45:00Z',
        tags: ['geometric', 'abstract', 'flow', 'gradient'],
        isLiked: false,
        likes: 89,
        downloads: 56
      },
      {
        id: '3',
        title: 'Minimalist Mountain Range',
        prompt: 'Clean minimalist mountain silhouette against sunset',
        imageUrl: 'https://picsum.photos/500/400?random=3',
        model: 'imagen4',
        style: 'minimalist',
        createdAt: '2024-01-13T08:20:00Z',
        tags: ['mountain', 'minimalist', 'sunset', 'nature'],
        isLiked: false,
        likes: 156,
        downloads: 203
      },
      {
        id: '4',
        title: 'Retro Synthwave City',
        prompt: 'Neon synthwave cityscape with retro 80s aesthetic',
        imageUrl: 'https://picsum.photos/600/400?random=4',
        model: 'flux-kontext',
        style: 'vintage',
        createdAt: '2024-01-12T20:10:00Z',
        tags: ['synthwave', 'retro', 'neon', 'city'],
        isLiked: true,
        likes: 298,
        downloads: 187
      },
      {
        id: '5',
        title: 'Artistic Portrait Study',
        prompt: 'Expressive artistic portrait with painterly brushstrokes',
        imageUrl: 'https://picsum.photos/400/500?random=5',
        model: 'sd35',
        style: 'artistic',
        createdAt: '2024-01-11T12:00:00Z',
        tags: ['portrait', 'artistic', 'painting', 'expressive'],
        isLiked: false,
        likes: 67,
        downloads: 34
      },
      {
        id: '6',
        title: 'Space Galaxy Swirl',
        prompt: 'Swirling galaxy with bright stars and cosmic dust',
        imageUrl: 'https://picsum.photos/500/500?random=6',
        model: 'flux-kontext',
        style: 'photorealistic',
        createdAt: '2024-01-10T16:30:00Z',
        tags: ['galaxy', 'space', 'stars', 'cosmic'],
        isLiked: true,
        likes: 445,
        downloads: 321
      }
    ]

    setTimeout(() => {
      setDesigns(mockDesigns)
      setIsLoading(false)
    }, 1000)
  }, [])

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         design.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         design.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = selectedFilter === 'all' || design.style === selectedFilter
    
    return matchesSearch && matchesFilter
  })

  const sortedDesigns = [...filteredDesigns].sort((a, b) => {
    switch (selectedSort) {
      case 'popular':
        return (b.likes + b.downloads) - (a.likes + a.downloads)
      case 'liked':
        return b.likes - a.likes
      case 'downloads':
        return b.downloads - a.downloads
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const toggleLike = (designId: string) => {
    setDesigns(prev => prev.map(design => 
      design.id === designId 
        ? { ...design, isLiked: !design.isLiked, likes: design.isLiked ? design.likes - 1 : design.likes + 1 }
        : design
    ))
  }

  const handleDownload = (design: Design) => {
    // In real app, this would trigger actual download
    console.log('Downloading design:', design.title)
  }

  const handleAddToCart = (design: Design) => {
    // In real app, this would add to cart
    console.log('Adding to cart:', design.title)
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <FloatingNavbar />

      {/* Moving background */}
      <div className="cosmic-moving-background">
        <div className="cosmic-orb cosmic-orb-1"></div>
        <div className="cosmic-orb cosmic-orb-2"></div>
        <div className="cosmic-orb cosmic-orb-3"></div>
        <div className="cosmic-orb cosmic-orb-4"></div>
        <div className="cosmic-orb cosmic-orb-5"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-display-large cosmic-text-gradient mb-4">
            Design Gallery
          </h1>
          <p className="text-body-large text-white/80 max-w-2xl mx-auto">
            Explore our collection of AI-generated designs. Browse, favorite, and use any design for your custom apparel.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="cosmic-card mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">🔍</span>
              <input
                type="text"
                placeholder="Search designs, prompts, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cosmic-input w-full pl-10 pr-4 py-3"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="cosmic-select px-4 py-3"
              >
                {filters.map(filter => (
                  <option key={filter.id} value={filter.id} className="bg-gray-800">
                    {filter.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="cosmic-select px-4 py-3"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id} className="bg-gray-800">
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/60">
            {isLoading ? 'Loading...' : `Showing ${sortedDesigns.length} designs`}
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-white/60 hover:text-white'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'masonry' ? 'bg-purple-500/20 text-purple-400' : 'text-white/60 hover:text-white'}`}
            >
              Masonry
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="cosmic-card animate-pulse">
                <div className="aspect-square bg-white/10 rounded-lg mb-4"></div>
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'columns-1 md:columns-2 lg:columns-3 xl:columns-4'}`}>
            {sortedDesigns.map((design) => (
              <div key={design.id} className="cosmic-card cosmic-card-interactive group break-inside-avoid mb-6">
                {/* Image */}
                <div className="relative overflow-hidden rounded-lg mb-4">
                  <img
                    src={design.imageUrl}
                    alt={design.title}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <button
                      onClick={() => toggleLike(design.id)}
                      className="cosmic-button cosmic-button-glass cosmic-button-sm"
                    >
                      <span className={design.isLiked ? "text-pink-400" : "text-white"}>
                        {design.isLiked ? "❤️" : "🤍"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDownload(design)}
                      className="cosmic-button cosmic-button-glass cosmic-button-sm"
                    >
                      <span>⬇️</span>
                    </button>
                    <button className="cosmic-button cosmic-button-glass cosmic-button-sm">
                      <span>📤</span>
                    </button>
                  </div>

                  {/* Model Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-black/60 text-xs font-medium rounded-full text-white/80">
                      {design.model.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-white mb-1">{design.title}</h3>
                    <p className="text-sm text-white/60 line-clamp-2">{design.prompt}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {design.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-white/10 text-xs rounded-full text-white/70">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span>🤍</span>
                        {design.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>⬇️</span>
                        {design.downloads}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddToCart(design)}
                      className="cosmic-button cosmic-button-accent cosmic-button-sm"
                    >
                      <span className="mr-1">🛒</span>
                      Use Design
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedDesigns.length === 0 && (
          <div className="text-center py-12">
            <div className="cosmic-card max-w-md mx-auto">
              <div className="text-6xl text-white/30 mx-auto mb-4">🔍</div>
              <h3 className="text-h6 font-medium mb-2">No designs found</h3>
              <p className="text-white/60 mb-4">
                Try adjusting your search terms or filters to find more designs.
              </p>
              <button className="cosmic-button cosmic-button-primary">
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
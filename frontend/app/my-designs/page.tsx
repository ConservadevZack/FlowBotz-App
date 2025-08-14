"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import FloatingNavbar from '@/components/FloatingNavbar'

interface Design {
  id: string
  title: string
  prompt: string
  imageUrl: string
  model: string
  style: string
  size: string
  createdAt: string
  isPublic: boolean
}

export default function MyDesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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
        size: '1024x1024',
        createdAt: '2024-01-15T10:30:00Z',
        isPublic: true
      },
      {
        id: '2',
        title: 'Abstract Flow',
        prompt: 'Flowing geometric patterns in purple and blue gradients',
        imageUrl: 'https://picsum.photos/400/600?random=2',
        model: 'sd35',
        style: 'abstract',
        size: '768x1024',
        createdAt: '2024-01-14T15:45:00Z',
        isPublic: false
      }
    ]

    setTimeout(() => {
      setDesigns(mockDesigns)
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleSelectDesign = (designId: string) => {
    setSelectedDesigns(prev => 
      prev.includes(designId) 
        ? prev.filter(id => id !== designId)
        : [...prev, designId]
    )
  }

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedDesigns.length} selected designs?`)) {
      setDesigns(prev => prev.filter(design => !selectedDesigns.includes(design.id)))
      setSelectedDesigns([])
    }
  }

  return (
    <ProtectedRoute>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-display-large cosmic-text-gradient mb-4">
                My Designs
              </h1>
              <p className="text-body-large text-white/80">
                Manage your AI-generated designs and creations.
              </p>
            </div>
            
            <Link href="/create" className="cosmic-button cosmic-button-primary cosmic-button-lg mt-4 md:mt-0">
              <span className="mr-2">✨</span>
              Create New Design
            </Link>
          </div>

          {/* Controls */}
          <div className="cosmic-card mb-8">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-white/80 text-sm">
                  {designs.length} designs total
                </span>
                {selectedDesigns.length > 0 && (
                  <>
                    <span className="text-purple-400 text-sm">
                      {selectedDesigns.length} selected
                    </span>
                    <button
                      onClick={handleDeleteSelected}
                      className="cosmic-button cosmic-button-ghost cosmic-button-sm text-red-400 hover:text-red-300"
                    >
                      <span className="mr-1">🗑️</span>
                      Delete Selected
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>⊞</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>☰</span>
                </button>
              </div>
            </div>
          </div>

          {/* Designs Grid */}
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
          ) : designs.length === 0 ? (
            <div className="text-center py-16">
              <div className="cosmic-card max-w-md mx-auto">
                <div className="text-6xl text-white/30 mb-4">🎨</div>
                <h3 className="text-h5 font-medium mb-4 text-white">No designs yet</h3>
                <p className="text-white/60 mb-6">
                  Start creating amazing AI-powered designs to see them here.
                </p>
                <Link href="/create" className="cosmic-button cosmic-button-primary">
                  <span className="mr-2">✨</span>
                  Create Your First Design
                </Link>
              </div>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {designs.map((design) => (
                <div key={design.id} className={`cosmic-card cosmic-card-interactive group ${
                  viewMode === 'list' ? 'flex gap-4 items-center' : ''
                }`}>
                  {/* Selection Checkbox */}
                  <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'absolute top-3 left-3 z-10'}`}>
                    <input
                      type="checkbox"
                      checked={selectedDesigns.includes(design.id)}
                      onChange={() => handleSelectDesign(design.id)}
                      className="cosmic-checkbox"
                    />
                  </div>

                  {/* Image */}
                  <div className={`relative overflow-hidden ${
                    viewMode === 'list' ? 'w-24 h-24 flex-shrink-0' : 'aspect-square mb-4'
                  }`} style={{ borderRadius: 'var(--radius-lg)' }}>
                    <img
                      src={design.imageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <button className="cosmic-button cosmic-button-glass cosmic-button-sm">
                        <span>👁️</span>
                      </button>
                      <button className="cosmic-button cosmic-button-glass cosmic-button-sm">
                        <span>⬇️</span>
                      </button>
                      <button className="cosmic-button cosmic-button-glass cosmic-button-sm">
                        <span>📤</span>
                      </button>
                    </div>

                    {/* Public Badge */}
                    {design.isPublic && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Public
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'space-y-3'}`}>
                    <div>
                      <h3 className="font-semibold text-white mb-1 truncate">{design.title}</h3>
                      <p className={`text-sm text-white/60 ${viewMode === 'list' ? 'line-clamp-1' : 'line-clamp-2'}`}>
                        {design.prompt}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className={`${viewMode === 'list' ? 'flex items-center gap-4 text-xs' : 'space-y-2'}`}>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{design.model.toUpperCase()}</span>
                        <span>•</span>
                        <span>{design.size}</span>
                        <span>•</span>
                        <span>{new Date(design.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {viewMode === 'grid' && (
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-white/10 text-xs rounded-full text-white/70 capitalize">
                            {design.style}
                          </span>
                          <button className="cosmic-button cosmic-button-ghost cosmic-button-sm">
                            <span className="mr-1">⚙️</span>
                            Actions
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
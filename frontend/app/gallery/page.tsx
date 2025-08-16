'use client'

import { useState } from 'react'
import Navigation from '../components/Navigation'

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const designs = [
    { id: 1, title: 'Cosmic Wolf', category: 'animals', likes: 234, author: 'AlexArt' },
    { id: 2, title: 'Neon Cityscape', category: 'abstract', likes: 189, author: 'CyberDesign' },
    { id: 3, title: 'Mountain Sunrise', category: 'nature', likes: 156, author: 'NatureLover' },
    { id: 4, title: 'Retro Logo', category: 'logos', likes: 298, author: 'BrandMaster' },
    { id: 5, title: 'Space Explorer', category: 'characters', likes: 445, author: 'SciFiArt' },
    { id: 6, title: 'Geometric Pattern', category: 'abstract', likes: 167, author: 'PatternPro' },
    { id: 7, title: 'Ocean Waves', category: 'nature', likes: 223, author: 'WaveRider' },
    { id: 8, title: 'Tech Startup Logo', category: 'logos', likes: 334, author: 'StartupDesign' }
  ]

  const categories = ['all', 'abstract', 'nature', 'logos', 'characters', 'animals']

  const filteredDesigns = selectedCategory === 'all' 
    ? designs 
    : designs.filter(design => design.category === selectedCategory)

  return (
    <div style={{ 
      minHeight: '100vh', 
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Navigation />

      {/* Main Content */}
      <main style={{ paddingTop: '80px', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '16px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Design Gallery
            </h1>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Explore amazing AI-generated designs created by our community
            </p>
          </div>

          {/* Category Filter */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '48px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedCategory === category 
                    ? 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: selectedCategory === category 
                    ? 'none'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '48px'
          }}>
            {filteredDesigns.map((design) => (
              <div key={design.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'pointer'
              }}>
                {/* Image Placeholder */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: `linear-gradient(135deg, 
                    ${design.category === 'abstract' ? '#8B5CF6, #EC4899' :
                      design.category === 'nature' ? '#10B981, #06B6D4' :
                      design.category === 'logos' ? '#F59E0B, #EF4444' :
                      design.category === 'characters' ? '#EC4899, #8B5CF6' :
                      '#06B6D4, #10B981'})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: 'white'
                }}>
                  {design.category === 'abstract' ? '🎨' :
                   design.category === 'nature' ? '🌄' :
                   design.category === 'logos' ? '🏷️' :
                   design.category === 'characters' ? '👤' :
                   design.category === 'animals' ? '🐺' : '✨'}
                </div>

                {/* Card Content */}
                <div style={{ padding: '20px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    {design.title}
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'capitalize'
                    }}>
                      by {design.author}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#EC4899',
                      textTransform: 'capitalize'
                    }}>
                      {design.category}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#EF4444'
                    }}>
                      <span>❤️</span>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {design.likes}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '4px',
                        color: '#8B5CF6',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}>
                        View
                      </button>
                      <button style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '4px',
                        color: '#EC4899',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}>
                        Remix
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#fff'
            }}>
              Community Stats
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8B5CF6' }}>
                  12.5K
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Designs Created
                </div>
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#EC4899' }}>
                  3.2K
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Active Creators
                </div>
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>
                  85K
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Total Likes
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
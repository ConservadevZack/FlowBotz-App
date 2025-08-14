"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import FloatingNavbar from '@/components/FloatingNavbar'
import { authService } from '@/lib/auth'

export default function DashboardPage() {
  const [user, setUser] = useState(authService.getUser())
  const [recentDesigns, setRecentDesigns] = useState([
    {
      id: '1',
      title: 'Cosmic Wolf Design',
      thumbnail: 'https://picsum.photos/200/200?random=1',
      createdAt: '2024-01-15',
      status: 'completed'
    },
    {
      id: '2',
      title: 'Abstract Gradient',
      thumbnail: 'https://picsum.photos/200/200?random=2',
      createdAt: '2024-01-14',
      status: 'completed'
    }
  ])

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const getUsagePercentage = () => {
    if (!user) return 0
    return (user.generationsUsed / user.generationsLimit) * 100
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
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-display-large cosmic-text-gradient mb-4">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-body-large text-white/80">
              Ready to create some amazing AI-powered designs?
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="cosmic-card text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {user?.generationsUsed || 0}
              </div>
              <div className="text-white/60 text-sm">Designs Created</div>
            </div>
            
            <div className="cosmic-card text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {user?.generationsLimit ? user.generationsLimit - user.generationsUsed : 0}
              </div>
              <div className="text-white/60 text-sm">Remaining This Month</div>
            </div>
            
            <div className="cosmic-card text-center">
              <div className="text-2xl font-bold cosmic-text-gradient mb-2 capitalize">
                {user?.plan || 'Starter'}
              </div>
              <div className="text-white/60 text-sm">Current Plan</div>
            </div>
            
            <div className="cosmic-card text-center">
              <div className="text-2xl font-bold text-white mb-2">24</div>
              <div className="text-white/60 text-sm">Days Remaining</div>
            </div>
          </div>

          {/* Usage Progress */}
          <div className="cosmic-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h5 font-semibold text-white">Monthly Usage</h3>
              <span className="text-sm text-white/60">
                {user?.generationsUsed || 0} / {user?.generationsLimit || 0}
              </span>
            </div>
            <div className="w-full bg-white/10 h-3" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ 
                  width: `${getUsagePercentage()}%`,
                  borderRadius: 'var(--radius-lg)'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div className="cosmic-card">
              <h3 className="text-h5 font-semibold text-white mb-6">Quick Actions</h3>
              <div className="space-y-4">
                <Link href="/create" className="block w-full cosmic-button cosmic-button-primary cosmic-button-lg">
                  <span className="mr-2">✨</span>
                  Create New Design
                </Link>
                
                <Link href="/gallery" className="block w-full cosmic-button cosmic-button-secondary">
                  <span className="mr-2">🖼️</span>
                  Browse Gallery
                </Link>
                
                <Link href="/my-designs" className="block w-full cosmic-button cosmic-button-glass">
                  <span className="mr-2">📁</span>
                  My Designs
                </Link>
              </div>
            </div>

            {/* Recent Designs */}
            <div className="cosmic-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h5 font-semibold text-white">Recent Designs</h3>
                <Link href="/my-designs" className="text-purple-400 hover:text-purple-300 text-sm">
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentDesigns.map((design) => (
                  <div key={design.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <img 
                      src={design.thumbnail} 
                      alt={design.title}
                      className="w-12 h-12 object-cover"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{design.title}</div>
                      <div className="text-white/60 text-xs">{design.createdAt}</div>
                    </div>
                    <span className="text-green-400 text-xs">✓</span>
                  </div>
                ))}
                
                {recentDesigns.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl text-white/30 mb-2">🎨</div>
                    <p className="text-white/60 text-sm">No designs yet</p>
                    <Link href="/create" className="text-purple-400 hover:text-purple-300 text-sm">
                      Create your first design
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Upgrade CTA */}
          {user?.plan === 'starter' && (
            <div className="cosmic-card-feature text-center mt-8">
              <h3 className="text-h4 font-bold text-white mb-4">Ready for More?</h3>
              <p className="text-white/70 mb-6">
                Upgrade to Creator plan for unlimited designs, premium models, and commercial usage rights.
              </p>
              <Link href="/pricing" className="cosmic-button cosmic-button-accent cosmic-button-lg">
                <span className="mr-2">🚀</span>
                Upgrade Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
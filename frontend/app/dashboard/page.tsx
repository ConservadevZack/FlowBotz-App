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
      <div className="min-h-screen pt-20 pb-12">
        <FloatingNavbar />
        
        {/* Moving background */}
        <div className="cosmic-moving-background">
          <div className="cosmic-orb cosmic-orb-1"></div>
          <div className="cosmic-orb cosmic-orb-2"></div>
          <div className="cosmic-orb cosmic-orb-3"></div>
          <div className="cosmic-orb cosmic-orb-4"></div>
          <div className="cosmic-orb cosmic-orb-5"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Welcome Section */}
          <section className="mb-12 cosmic-animate-page-enter" aria-labelledby="welcome-heading">
            <div className="cosmic-card-premium p-8 sm:p-10 lg:p-12">
              <h1 id="welcome-heading" className="text-display-medium cosmic-text-gradient mb-6 font-bold">
                Welcome back, {user?.firstName || 'Creator'}!
              </h1>
              <p className="text-lg text-white/85 font-medium leading-relaxed max-w-3xl">
                Ready to create some amazing AI-powered designs? Let's turn your imagination into reality.
              </p>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="mb-12" aria-labelledby="stats-overview">
            <h2 id="stats-overview" className="sr-only">Account Statistics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 cosmic-stagger">
              <div className="cosmic-card-premium text-center cosmic-animate-scale-in cosmic-interactive cosmic-focus-ring cosmic-tooltip p-8 min-h-[140px] flex items-center justify-center" tabIndex="0" role="img" aria-labelledby="designs-created-value designs-created-label">
                <div className="cosmic-tooltip-content">Total designs you've created</div>
                <div className="space-y-3">
                  <div id="designs-created-value" className="text-3xl sm:text-4xl font-extrabold text-white cosmic-animate-text-reveal tracking-tight">
                    {user?.generationsUsed || 0}
                  </div>
                  <div id="designs-created-label" className="text-white/70 text-sm font-semibold">Designs Created</div>
                </div>
              </div>
              
              <div className="cosmic-card-premium text-center cosmic-animate-scale-in cosmic-interactive cosmic-focus-ring cosmic-tooltip p-8 min-h-[140px] flex items-center justify-center" tabIndex="0" role="img" aria-labelledby="remaining-value remaining-label">
                <div className="cosmic-tooltip-content">Designs left this month</div>
                <div className="space-y-3">
                  <div id="remaining-value" className="text-3xl sm:text-4xl font-extrabold text-green-400 cosmic-animate-text-reveal tracking-tight">
                    {user?.generationsLimit ? user.generationsLimit - user.generationsUsed : 10}
                  </div>
                  <div id="remaining-label" className="text-white/70 text-sm font-semibold">Remaining This Month</div>
                </div>
              </div>
              
              <div className="cosmic-card-premium text-center cosmic-animate-scale-in cosmic-interactive cosmic-focus-ring cosmic-tooltip p-8 min-h-[140px] flex items-center justify-center" tabIndex="0" role="img" aria-labelledby="plan-value plan-label">
                <div className="cosmic-tooltip-content">Your subscription plan</div>
                <div className="space-y-3">
                  <div id="plan-value" className="text-2xl sm:text-3xl font-extrabold cosmic-text-gradient capitalize cosmic-animate-text-reveal tracking-tight">
                    {user?.plan || 'Starter'}
                  </div>
                  <div id="plan-label" className="text-white/70 text-sm font-semibold">Current Plan</div>
                </div>
              </div>
              
              <div className="cosmic-card-premium text-center cosmic-animate-scale-in cosmic-interactive cosmic-focus-ring cosmic-tooltip p-8 min-h-[140px] flex items-center justify-center" tabIndex="0" role="img" aria-labelledby="days-value days-label">
                <div className="cosmic-tooltip-content">Days until plan renewal</div>
                <div className="space-y-3">
                  <div id="days-value" className="text-3xl sm:text-4xl font-extrabold text-yellow-400 cosmic-animate-text-reveal tracking-tight">24</div>
                  <div id="days-label" className="text-white/70 text-sm font-semibold">Days Remaining</div>
                </div>
              </div>
            </div>
          </section>

          {/* Usage Progress */}
          <section className="cosmic-card-premium mb-12 cosmic-animate-slide-in-left p-8" aria-labelledby="usage-heading">
            <div className="flex items-center justify-between mb-8">
              <h3 id="usage-heading" className="text-xl font-bold text-white">Monthly Usage</h3>
              <span className="text-lg text-white/75 font-semibold">
                {user?.generationsUsed || 0} / {user?.generationsLimit || 0}
              </span>
            </div>
            <div className="cosmic-progress h-5 rounded-full" role="progressbar" aria-valuenow={getUsagePercentage()} aria-valuemin={0} aria-valuemax={100} aria-labelledby="usage-heading">
              <div 
                className="cosmic-progress-bar rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${getUsagePercentage()}%`
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-white/60 font-medium">0</span>
              <span className="text-sm text-white/60 font-medium">{getUsagePercentage().toFixed(1)}% used</span>
              <span className="text-sm text-white/60 font-medium">{user?.generationsLimit || 0}</span>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 cosmic-stagger">
            {/* Quick Actions */}
            <section className="cosmic-card-premium cosmic-animate-slide-in-left p-8" aria-labelledby="quick-actions-heading">
              <h3 id="quick-actions-heading" className="text-xl font-bold text-white mb-8">Quick Actions</h3>
              <div className="space-y-5">
                <Link href="/creator" className="block w-full cosmic-button-premium cosmic-button-lg cosmic-focus-ring cosmic-tooltip min-h-[64px] font-bold text-lg shadow-xl hover:scale-105 transition-all duration-300">
                  <div className="cosmic-tooltip-content">Start creating a new design</div>
                  <span className="mr-3 cosmic-animate-icon-bounce text-2xl">✨</span>
                  Create New Design
                </Link>
                
                <Link href="/gallery" className="block w-full cosmic-button cosmic-button-secondary cosmic-focus-ring min-h-[56px] font-semibold text-base hover:scale-105 transition-all duration-300">
                  <span className="mr-3 text-xl">🖼️</span>
                  Browse Gallery
                </Link>
                
                <Link href="/my-designs" className="block w-full cosmic-button cosmic-button-glass cosmic-focus-ring min-h-[56px] font-semibold text-base border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300">
                  <span className="mr-3 text-xl">📁</span>
                  My Designs
                </Link>
              </div>
            </section>

            {/* Recent Designs */}
            <section className="cosmic-card-premium cosmic-animate-slide-in-right p-8" aria-labelledby="recent-designs-heading">
              <div className="flex items-center justify-between mb-8">
                <h3 id="recent-designs-heading" className="text-xl font-bold text-white">Recent Designs</h3>
                <Link href="/my-designs" className="text-purple-300 hover:text-purple-200 text-base font-semibold cosmic-focus-ring rounded-lg px-3 py-2 hover:bg-purple-500/20 transition-all duration-300">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentDesigns.map((design, index) => (
                  <article 
                    key={design.id} 
                    className="flex items-center gap-4 p-5 rounded-xl hover:bg-white/8 transition-all duration-300 cosmic-interactive cosmic-focus-ring group border border-transparent hover:border-white/20" 
                    tabIndex={0}
                    style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                    aria-labelledby={`design-${design.id}-title`}
                  >
                    <img 
                      src={design.thumbnail} 
                      alt={design.title}
                      className="w-14 h-14 object-cover shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                    />
                    <div className="flex-1">
                      <div id={`design-${design.id}-title`} className="font-semibold text-white text-base mb-1">{design.title}</div>
                      <div className="text-white/70 text-sm font-medium">{design.createdAt}</div>
                    </div>
                    <span className="text-green-400 text-xl font-bold">✓</span>
                  </article>
                ))}
                
                {recentDesigns.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl text-white/30 mb-4">🎨</div>
                    <p className="text-white/70 text-lg mb-4 font-medium">No designs yet</p>
                    <Link href="/creator" className="text-purple-300 hover:text-purple-200 text-base font-semibold cosmic-focus-ring rounded-lg px-4 py-2 hover:bg-purple-500/20 transition-all duration-300">
                      Create your first design →
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Plan Upgrade CTA */}
          {(user?.plan === 'starter' || !user?.plan) && (
            <section className="cosmic-card-premium text-center mt-12 cosmic-animate-bounce-in p-10 border-2 border-purple-500/30" aria-labelledby="upgrade-heading">
              <h3 id="upgrade-heading" className="text-2xl font-bold text-white mb-6">Ready for More?</h3>
              <p className="text-white/80 mb-8 text-lg font-medium leading-relaxed max-w-2xl mx-auto">
                Upgrade to Creator plan for unlimited designs, premium models, and commercial usage rights.
              </p>
              <Link href="/pricing" className="cosmic-button cosmic-button-accent cosmic-button-xl font-bold text-xl shadow-2xl hover:scale-105 transition-all duration-300 min-h-[64px]">
                <span className="mr-3 text-2xl">🚀</span>
                Upgrade Now
              </Link>
            </section>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
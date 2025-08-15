"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function FloatingNavbar() {
  const { user, loading, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const publicNavItems = [
    { href: '/', label: 'Home' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/pricing', label: 'Pricing' }
  ]

  const authenticatedNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/creator', label: 'Creator' },
    { href: '/gallery', label: 'Gallery' }
  ]

  const userDropdownItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/creator', label: 'Creator', icon: '🎨' },
    { href: '/my-designs', label: 'My Designs', icon: '🎯' },
    { href: '/gallery', label: 'Gallery', icon: '🖼️' },
    { href: '/pricing', label: 'Upgrade Plan', icon: '⭐' }
  ]

  const navItems = user ? authenticatedNavItems : publicNavItems

  return (
    <nav className={`fixed top-2 left-4 right-4 z-50 transition-all duration-300 cosmic-animate-slide-in-left ${
      isScrolled ? 'top-1' : 'top-2'
    }`} role="navigation" aria-label="Main navigation">
      <div className={`max-w-7xl mx-auto transition-all duration-300 ${
        isScrolled 
          ? 'cosmic-glass-strong backdrop-blur-xl border-white/30' 
          : 'cosmic-glass-medium border-white/20'
      } border shadow-2xl`} 
      style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3 cosmic-interactive cosmic-focus-ring cosmic-tooltip group" aria-label="FlowBotz homepage">
              <div className="cosmic-tooltip-content">FlowBotz - AI Design Platform</div>
              <div className="stellar-glass-purple w-10 h-10 flex items-center justify-center cosmic-animate-glow group-hover:scale-110 transition-all duration-300" style={{ borderRadius: 'var(--radius-lg)' }}>
                <span className="text-white font-bold text-base cosmic-animate-icon-bounce">F</span>
              </div>
              <span className="text-xl cosmic-text-gradient font-bold hidden sm:block cosmic-animate-text-reveal group-hover:scale-105 transition-transform duration-300">FlowBotz</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2" role="menubar">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={`px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm cosmic-focus-ring cosmic-interactive cosmic-tooltip ${
                    pathname === item.href
                      ? 'bg-purple-500/25 text-purple-200 shadow-lg cosmic-animate-glow border border-purple-400/30'
                      : 'text-white/85 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  <div className="cosmic-tooltip-content">{`Navigate to ${item.label}`}</div>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 px-2 py-2 h-10 rounded-xl hover:bg-white/10 transition-all duration-300 cosmic-focus-ring cosmic-interactive cosmic-tooltip group"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                    aria-label="User menu"
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="cosmic-tooltip-content">User account menu</div>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-110 transition-transform duration-300" style={{ borderRadius: 'var(--radius-md)' }}>
                      {(user.user_metadata?.first_name || user.user_metadata?.firstName || user.email || 'U')[0]}
                    </div>
                    <div className="text-left hidden xl:block min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'}
                      </div>
                      <div className="text-xs text-white/70 font-medium">
                        Starter
                      </div>
                    </div>
                    <span className="text-white/70 text-xs transition-transform duration-300 group-hover:scale-110">
                      {isUserDropdownOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* User Dropdown */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 top-full mt-3 w-64 cosmic-card-premium backdrop-blur-xl border border-white/30 shadow-2xl cosmic-animate-scale-in z-50" 
                         style={{ borderRadius: 'var(--radius-xl)' }}
                         role="menu"
                         aria-label="User account options">
                      <div className="p-4 border-b border-white/15">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base shadow-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                            {(user.user_metadata?.first_name || user.user_metadata?.firstName || user.email || 'U')[0]}
                            {(user.user_metadata?.last_name || user.user_metadata?.lastName || '')[0]}
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-semibold text-white">
                              {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'} {user.user_metadata?.last_name || user.user_metadata?.lastName || ''}
                            </div>
                            <div className="text-sm text-white/70 font-medium">
                              {user.email}
                            </div>
                            <div className="text-sm text-purple-300 font-semibold mt-1">
                              Starter Plan
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3">
                        {userDropdownItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsUserDropdownOpen(false)}
                            role="menuitem"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold cosmic-focus-ring cosmic-interactive hover:scale-105 ${
                              pathname === item.href
                                ? 'bg-purple-500/25 text-purple-200 border border-purple-400/30'
                                : 'text-white/85 hover:text-white hover:bg-white/10'
                            }`}
                            style={{ borderRadius: 'var(--radius-lg)' }}
                          >
                            <span className="text-xl">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                        
                        <div className="border-t border-white/15 mt-3 pt-3">
                          <button
                            onClick={() => {
                              handleSignOut()
                              setIsUserDropdownOpen(false)
                            }}
                            role="menuitem"
                            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold text-white/85 hover:text-white hover:bg-red-500/20 w-full text-left cosmic-focus-ring cosmic-interactive hover:scale-105 border border-transparent hover:border-red-400/30"
                            style={{ borderRadius: 'var(--radius-lg)' }}
                          >
                            <span className="text-xl">🚪</span>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="cosmic-button cosmic-button-ghost cosmic-button-sm cosmic-focus-ring text-sm cosmic-tooltip font-semibold hover:scale-105 transition-transform duration-300">
                    <div className="cosmic-tooltip-content">Sign in to your account</div>
                    Sign In
                  </Link>
                  <Link href="/signup" className="cosmic-button-premium cosmic-button-sm cosmic-focus-ring text-sm cosmic-tooltip font-semibold hover:scale-105 transition-transform duration-300 shadow-lg">
                    <div className="cosmic-tooltip-content">Create a new account</div>
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden cosmic-button cosmic-button-glass cosmic-button-sm cosmic-focus-ring p-3 cosmic-tooltip hover:scale-110 transition-all duration-300"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <div className="cosmic-tooltip-content">{isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}</div>
              <span className="text-xl cosmic-animate-icon-bounce transition-transform duration-300">
                {isMobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden mt-6 pt-6 border-t border-white/20 space-y-4 cosmic-animate-fade-in" role="menu">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  role="menuitem"
                  className={`block px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-base cosmic-focus-ring cosmic-interactive hover:scale-105 ${
                    pathname === item.href
                      ? 'bg-purple-500/25 text-purple-200 border border-purple-400/30 shadow-lg'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                  style={{ 
                    borderRadius: 'var(--radius-lg)',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  {item.label}
                </Link>
              ))}
              
              <div className="pt-6 border-t border-white/20 space-y-4">
                {user ? (
                  <>
                    <div className="px-6 py-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-base font-semibold text-white">
                        {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'} {user.user_metadata?.last_name || user.user_metadata?.lastName || ''}
                      </div>
                      <div className="text-sm text-white/70 font-medium capitalize mt-1">
                        Starter Plan
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full cosmic-button cosmic-button-ghost cosmic-focus-ring hover:bg-red-500/20 hover:border-red-400/30 font-semibold"
                    >
                      <span className="mr-2">🚪</span>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full cosmic-button cosmic-button-ghost cosmic-focus-ring font-semibold text-base min-h-[52px]"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full cosmic-button cosmic-button-primary cosmic-focus-ring font-semibold text-base min-h-[52px] shadow-lg"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
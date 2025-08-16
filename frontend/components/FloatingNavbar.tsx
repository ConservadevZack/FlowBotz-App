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
    <nav className={`fixed top-1 left-2 right-2 z-50 transition-all duration-300 cosmic-animate-slide-in-left compact-nav ${
      isScrolled ? 'top-0.5' : 'top-1'
    }`} role="navigation" aria-label="Main navigation">
      <div className={`transition-all duration-300 ${
        isScrolled 
          ? 'cosmic-glass-strong backdrop-blur-xl border-white/30' 
          : 'cosmic-glass-medium border-white/20'
      } border shadow-lg`} 
      style={{ borderRadius: 'clamp(0.5rem, 0.46rem + 0.2vw, 0.75rem)' }}>
        <div className="p-compact-base">
          <div className="flex items-center justify-between">
            {/* Logo - Much smaller */}
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 cosmic-interactive cosmic-focus-ring group compact-interactive" aria-label="FlowBotz homepage">
              <div className="stellar-glass-purple logo cosmic-animate-glow group-hover:scale-110 transition-all duration-300 flex items-center justify-center" style={{ borderRadius: 'clamp(0.25rem, 0.23rem + 0.1vw, 0.375rem)' }}>
                <span className="text-white font-bold cosmic-animate-icon-bounce">F</span>
              </div>
              <span className="text-compact-lg cosmic-text-gradient font-bold hidden sm:block cosmic-animate-text-reveal group-hover:scale-105 transition-transform duration-300">FlowBotz</span>
            </Link>

            {/* Desktop Navigation - Compact */}
            <div className="hidden md:flex items-center gap-1" role="menubar">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={`btn-compact-sm transition-all duration-300 cosmic-focus-ring cosmic-interactive nav-text ${
                    pathname === item.href
                      ? 'bg-purple-500/25 text-purple-200 shadow-md cosmic-animate-glow border border-purple-400/30'
                      : 'text-white/85 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  style={{ borderRadius: 'clamp(0.25rem, 0.23rem + 0.1vw, 0.375rem)' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Actions - Compact */}
            <div className="hidden md:flex items-center gap-1">
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-1 btn-compact-sm hover:bg-white/10 transition-all duration-300 cosmic-focus-ring cosmic-interactive group"
                    style={{ borderRadius: 'clamp(0.25rem, 0.23rem + 0.1vw, 0.375rem)' }}
                    aria-label="User menu"
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform duration-300" style={{ borderRadius: 'clamp(0.125rem, 0.11rem + 0.07vw, 0.25rem)' }}>
                      {(user.user_metadata?.first_name || user.user_metadata?.firstName || user.email || 'U')[0]}
                    </div>
                    <div className="text-left hidden lg:block min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'}
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
                  <Link href="/login" className="btn-compact-sm cosmic-button-ghost cosmic-focus-ring nav-text hover:scale-105 transition-transform duration-300">
                    Sign In
                  </Link>
                  <Link href="/signup" className="btn-compact-sm cosmic-button-premium cosmic-focus-ring nav-text hover:scale-105 transition-transform duration-300 shadow-md">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button - Compact */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn-compact-sm cosmic-button-glass cosmic-focus-ring compact-interactive hover:scale-110 transition-all duration-300"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="text-compact-base cosmic-animate-icon-bounce transition-transform duration-300">
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
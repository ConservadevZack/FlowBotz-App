"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function FloatingNavbar() {
  const { user, loading, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
    { href: '/create', label: 'Create' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/my-designs', label: 'My Designs' }
  ]

  const navItems = user ? authenticatedNavItems : publicNavItems

  return (
    <nav className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 ${
      isScrolled ? 'top-2' : 'top-4'
    }`}>
      <div className={`max-w-7xl mx-auto transition-all duration-300 ${
        isScrolled 
          ? 'cosmic-glass-strong backdrop-blur-xl' 
          : 'cosmic-glass-medium'
      } border border-white/20 shadow-2xl`} 
      style={{ borderRadius: 'var(--radius-2xl)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3">
              <div className="stellar-glass-purple w-10 h-10 flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-h6 cosmic-text-gradient font-bold hidden sm:block">FlowBotz</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                    pathname === item.href
                      ? 'bg-purple-500/20 text-purple-300 shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'} {user.user_metadata?.last_name || user.user_metadata?.lastName || ''}
                      </div>
                      <div className="text-xs text-white/60 capitalize">
                        Starter Plan
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm" style={{ borderRadius: 'var(--radius-lg)' }}>
                      {(user.user_metadata?.first_name || user.user_metadata?.firstName || user.email || 'U')[0]}
                      {(user.user_metadata?.last_name || user.user_metadata?.lastName || '')[0]}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="cosmic-button cosmic-button-ghost cosmic-button-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="cosmic-button cosmic-button-ghost cosmic-button-sm">
                    Sign In
                  </Link>
                  <Link href="/signup" className="cosmic-button cosmic-button-primary cosmic-button-sm">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden cosmic-button cosmic-button-glass cosmic-button-sm p-2"
            >
              <span className="text-lg">
                {isMobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    pathname === item.href
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  {item.label}
                </Link>
              ))}
              
              <div className="pt-3 border-t border-white/10 space-y-3">
                {user ? (
                  <>
                    <div className="px-4 py-2">
                      <div className="text-sm font-medium text-white">
                        {user.user_metadata?.first_name || user.user_metadata?.firstName || 'User'} {user.user_metadata?.last_name || user.user_metadata?.lastName || ''}
                      </div>
                      <div className="text-xs text-white/60 capitalize">
                        Starter Plan
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full cosmic-button cosmic-button-ghost"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full cosmic-button cosmic-button-ghost"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full cosmic-button cosmic-button-primary"
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
"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function CompactNavbar() {
  const { user, loading, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const navItems = user ? authenticatedNavItems : publicNavItems

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 compact-nav-safe">
      <div className="max-w-7xl mx-auto px-4 safe-area-horizontal">
        <div className="flex items-center justify-between h-14">
          {/* Logo - Ultra compact */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">FlowBotz</span>
          </Link>

          {/* Desktop Navigation - Clean */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {(user.user_metadata?.first_name || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white text-sm hidden lg:block">
                    {user.user_metadata?.first_name || 'User'}
                  </span>
                  <span className="text-white/60 text-xs">▼</span>
                </button>

                {/* User Dropdown - Clean */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl py-1">
                    <div className="px-3 py-2 border-b border-white/10">
                      <div className="text-white text-sm font-medium">
                        {user.user_metadata?.first_name || 'User'}
                      </div>
                      <div className="text-white/60 text-xs">{user.email}</div>
                    </div>
                    <Link href="/dashboard" className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10">
                      Dashboard
                    </Link>
                    <Link href="/creator" className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10">
                      Creator
                    </Link>
                    <Link href="/my-designs" className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10">
                      My Designs
                    </Link>
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/signup" className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-md transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            <span className="sr-only">Open main menu</span>
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-white/10">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {user ? (
                <div className="border-t border-white/10 mt-2 pt-2 space-y-1">
                  <div className="px-3 py-2 text-sm text-white/60">
                    {user.user_metadata?.first_name || 'User'}
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="border-t border-white/10 mt-2 pt-2 space-y-2">
                  <Link href="/login" className="block px-3 py-2 text-sm text-white/80 hover:text-white">
                    Sign In
                  </Link>
                  <Link href="/signup" className="block px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-md text-center">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
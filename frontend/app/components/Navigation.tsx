'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navigation() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Navigation: Auth state changed:', event, session ? 'Logged in' : 'Not logged in')
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Close user menu on auth change
      setShowUserMenu(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  const isActive = (path: string) => mounted ? pathname === path : false

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserDisplayName = () => {
    if (!user) return 'User'
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
           user.email?.split('@')[0] || 
           'User'
  }

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || 
           user?.user_metadata?.picture || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=8B5CF6&color=fff&size=40`
  }

  if (!mounted) {
    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(11, 20, 38, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(147, 51, 234, 0.2)',
        padding: '12px 0',
        height: '56px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🚀 FlowBotz
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(11, 20, 38, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(147, 51, 234, 0.2)',
      padding: '12px 0'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            <span style={{
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              🚀 FlowBotz
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px'
        }}>
          <Link href="/creator" style={{ 
            color: isActive('/creator') || isActive('/create') ? '#8B5CF6' : 'rgba(255,255,255,0.8)', 
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}>
            Creator
          </Link>
          <Link href="/gallery" style={{ 
            color: isActive('/gallery') ? '#8B5CF6' : 'rgba(255,255,255,0.8)', 
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            opacity: 0.8
          }}>
            Gallery
          </Link>
          <Link href="/pricing" style={{ 
            color: isActive('/pricing') ? '#8B5CF6' : 'rgba(255,255,255,0.8)', 
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            opacity: 0.8
          }}>
            Pricing
          </Link>

          {/* Authentication Section */}
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  borderTop: '2px solid #8B5CF6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
              <span style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}>
                Loading...
              </span>
            </div>
          ) : user ? (
            /* Authenticated User Avatar & Menu */
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserMenu(!showUserMenu)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '24px',
                  padding: '4px 12px 4px 4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                }}
              >
                <img
                  src={getUserAvatar()}
                  alt={getUserDisplayName()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <span style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getUserDisplayName()}
                </span>
                <div style={{
                  width: '0',
                  height: '0',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid rgba(255, 255, 255, 0.8)',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'rgba(11, 20, 38, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '220px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  zIndex: 1001
                }}>
                  {/* User Info Header */}
                  <div style={{
                    padding: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <img
                        src={getUserAvatar()}
                        alt={getUserDisplayName()}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div>
                        <div style={{
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '2px'
                        }}>
                          {getUserDisplayName()}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '12px'
                        }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <Link
                      href="/dashboard"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>📊</span>
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>👤</span>
                      Profile
                    </Link>

                    <Link
                      href="/settings"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>⚙️</span>
                      Settings
                    </Link>

                    <Link
                      href="/help"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>❓</span>
                      Help & Support
                    </Link>

                    <div style={{
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      margin: '8px 0'
                    }} />

                    <button
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '14px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>🚪</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated State */
            <>
              <Link href="/login" style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: '#8B5CF6',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}>
                Sign In
              </Link>
              <Link href="/signup" style={{
                padding: '8px 16px',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                borderRadius: '6px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* CSS for loading spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </nav>
  )
}
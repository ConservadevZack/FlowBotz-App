"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let messageTimeoutId: NodeJS.Timeout
    
    // Show timeout message after 3 seconds
    if (loading) {
      messageTimeoutId = setTimeout(() => {
        setShowTimeoutMessage(true)
      }, 3000)
    } else {
      setShowTimeoutMessage(false)
    }
    
    if (!loading && !user) {
      console.log('ProtectedRoute: User not authenticated, redirecting to:', redirectTo)
      timeoutId = setTimeout(() => {
        router.push(redirectTo)
      }, 100)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (messageTimeoutId) clearTimeout(messageTimeoutId)
    }
  }, [user, loading, router, redirectTo])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Moving background */}
        <div className="cosmic-moving-background">
          <div className="cosmic-orb cosmic-orb-1"></div>
          <div className="cosmic-orb cosmic-orb-2"></div>
          <div className="cosmic-orb cosmic-orb-3"></div>
          <div className="cosmic-orb cosmic-orb-4"></div>
          <div className="cosmic-orb cosmic-orb-5"></div>
        </div>
        
        <div className="cosmic-card-hero text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/70">Verifying authentication...</p>
          {showTimeoutMessage && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">Taking longer than expected...</p>
              <div className="mt-2 space-x-2">
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="text-xs px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded transition-colors"
                >
                  Go to Login
                </button>
                {process.env.NODE_ENV === 'development' && (
                  <button 
                    onClick={() => {
                      localStorage.setItem('dev_auth_bypass', 'true')
                      window.location.reload()
                    }}
                    className="text-xs px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
                  >
                    Dev Bypass
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!user) {
    return null
  }

  return <>{children}</>
}
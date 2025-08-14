'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback on client side...')
        console.log('Current URL:', window.location.href)
        
        // Get the URL hash and search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        
        console.log('URL params:', {
          hash: window.location.hash,
          search: window.location.search,
          code: code ? 'present' : 'missing'
        })
        
        // Check for error in hash or search params
        const error = hashParams.get('error') || searchParams.get('error')
        if (error) {
          console.error('OAuth error:', error)
          router.push(`/login?error=oauth_error&details=${encodeURIComponent(error)}`)
          return
        }

        if (code) {
          console.log('Authorization code found, exchanging for session...')
          
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            router.push(`/login?error=exchange_error&details=${encodeURIComponent(exchangeError.message)}`)
            return
          }
          
          if (data.session && data.session.user) {
            console.log('OAuth success! User:', data.session.user.email)
            // Small delay to ensure session is fully established
            setTimeout(() => {
              router.push('/create')
            }, 1000)
            return
          }
        }

        // Fallback: try to get existing session
        console.log('No code found, checking for existing session...')
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push(`/login?error=session_error&details=${encodeURIComponent(sessionError.message)}`)
          return
        }

        if (data.session && data.session.user) {
          console.log('Existing session found! User:', data.session.user.email)
          router.push('/create')
        } else {
          console.log('No session found, redirecting to login')
          setTimeout(() => {
            router.push('/login?error=no_session')
          }, 2000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setTimeout(() => {
          router.push(`/login?error=callback_error&details=${encodeURIComponent(String(error))}`)
        }, 2000)
      }
    }

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(handleAuthCallback, 500)
    return () => clearTimeout(timer)
  }, [router])

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
        <p className="text-white/70">Completing sign-in...</p>
      </div>
    </div>
  )
}
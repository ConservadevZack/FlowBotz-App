'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Initializing authentication...')
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('AuthProvider: Session check timeout, setting loading to false')
          
          // In development, if there's a stored auth bypass, use it
          if (process.env.NODE_ENV === 'development') {
            const bypassAuth = localStorage.getItem('dev_auth_bypass')
            if (bypassAuth === 'true') {
              console.log('AuthProvider: Using development auth bypass')
              const mockUser = {
                id: 'dev-user',
                email: 'dev@test.com',
                user_metadata: {
                  first_name: 'Dev',
                  last_name: 'User'
                }
              } as User
              setUser(mockUser)
              setSession({ user: mockUser } as Session)
            }
          }
          
          setLoading(false)
        }, 5000) // 5 second timeout
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Session error:', error)
        } else {
          console.log('AuthProvider: Session check complete:', session ? 'Logged in' : 'Not logged in')
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        clearTimeout(timeoutId)
        setLoading(false)
      } catch (error) {
        console.error('AuthProvider: Initialization error:', error)
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event, session ? 'Logged in' : 'Not logged in')
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via auth provider:', session.user.email)
        // Optionally redirect to a specific page after sign in
        if (window.location.pathname === '/login') {
          setTimeout(() => {
            window.location.href = '/create'
          }, 100)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out via auth provider')
        // Optionally redirect to login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }
      }
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
import { supabase, getCurrentUser, getCurrentSession } from './supabase'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  plan: 'starter' | 'creator' | 'pro' | 'enterprise'
  generationsUsed: number
  generationsLimit: number
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false
  }
  private listeners: ((state: AuthState) => void)[] = []

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
      // Set up Supabase auth listener
      AuthService.instance.initAuthListener()
    }
    return AuthService.instance
  }

  private initAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.checkAuth()
      } else if (event === 'SIGNED_OUT') {
        this.authState.user = null
        this.authState.isAuthenticated = false
        this.authState.isLoading = false
        this.notify()
      }
    })
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.authState))
  }

  getState(): AuthState {
    return { ...this.authState }
  }

  async checkAuth(): Promise<boolean> {
    this.authState.isLoading = true
    this.notify()

    try {
      const session = await getCurrentSession()
      const user = await getCurrentUser()

      if (session && user) {
        // Map Supabase user to our User interface
        this.authState.user = {
          id: user.id,
          email: user.email || '',
          firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || 'User',
          lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
          plan: 'starter', // Default plan, can be fetched from user profile
          generationsUsed: 0,
          generationsLimit: 5
        }
        this.authState.isAuthenticated = true
      } else {
        this.authState.isAuthenticated = false
        this.authState.user = null
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      this.authState.isAuthenticated = false
      this.authState.user = null
    }

    this.authState.isLoading = false
    this.notify()
    return this.authState.isAuthenticated
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true
    this.notify()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('access_token', data.access_token)
        this.authState.user = data.user
        this.authState.isAuthenticated = true
        this.authState.isLoading = false
        this.notify()
        return { success: true }
      } else {
        const errorData = await response.json()
        this.authState.isLoading = false
        this.notify()
        return { success: false, error: errorData.message || 'Login failed' }
      }
    } catch (error) {
      this.authState.isLoading = false
      this.notify()
      return { success: false, error: 'Network error occurred' }
    }
  }

  async signUp(userData: {
    firstName: string
    lastName: string
    email: string
    password: string
  }): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true
    this.notify()

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('access_token', data.access_token)
        this.authState.user = data.user
        this.authState.isAuthenticated = true
        this.authState.isLoading = false
        this.notify()
        return { success: true }
      } else {
        const errorData = await response.json()
        this.authState.isLoading = false
        this.notify()
        return { success: false, error: errorData.message || 'Registration failed' }
      }
    } catch (error) {
      this.authState.isLoading = false
      this.notify()
      return { success: false, error: 'Network error occurred' }
    }
  }

  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    this.authState.isLoading = true
    this.notify()

    try {
      // Redirect to Google OAuth via Supabase
      const response = await fetch('/api/auth/google', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          // Redirect to Google OAuth URL
          window.location.href = data.url
          return { success: true }
        }
      }
      
      this.authState.isLoading = false
      this.notify()
      return { success: false, error: 'Failed to initiate Google OAuth' }
    } catch (error) {
      console.error('Google sign-in error:', error)
      this.authState.isLoading = false
      this.notify()
      return { success: false, error: 'Google OAuth failed' }
    }
  }

  async signOut() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    
    this.authState.user = null
    this.authState.isAuthenticated = false
    this.authState.isLoading = false
    this.notify()
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  getUser(): User | null {
    return this.authState.user
  }
}

export const authService = AuthService.getInstance()
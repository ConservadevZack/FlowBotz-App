// Mock createClient before any imports
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@supabase/supabase-js'

// Mock environment variables first
const mockEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}

describe('Supabase Configuration', () => {
  let supabase: any
  let getCurrentUser: any
  let getCurrentSession: any

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { 
          subscription: {
            unsubscribe: jest.fn(),
          }
        }
      })),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    
    // Mock process.env
    process.env = { ...process.env, ...mockEnvVars }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    
    // Import after mocking
    const module = require('@/lib/supabase')
    supabase = module.supabase
    getCurrentUser = module.getCurrentUser
    getCurrentSession = module.getCurrentSession
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('creates Supabase client with correct configuration', () => {
    expect(createClient).toHaveBeenCalledWith(
      mockEnvVars.NEXT_PUBLIC_SUPABASE_URL,
      mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: expect.any(Object),
        },
      }
    )
  })

  it('throws error when environment variables are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => {
      jest.resetModules()
      require('@/lib/supabase')
    }).toThrow('Missing Supabase environment variables')
  })

  it('throws error when URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = mockEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => {
      jest.resetModules()
      require('@/lib/supabase')
    }).toThrow('Missing Supabase environment variables')
  })

  it('throws error when anon key is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnvVars.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => {
      jest.resetModules()
      require('@/lib/supabase')
    }).toThrow('Missing Supabase environment variables')
  })
})

describe('Supabase Helper Functions', () => {
  let getCurrentUser: any
  let getCurrentSession: any
  
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { 
          subscription: {
            unsubscribe: jest.fn(),
          }
        }
      })),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...process.env, ...mockEnvVars }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    
    // Import helpers after mocking
    const module = require('@/lib/supabase')
    getCurrentUser = module.getCurrentUser
    getCurrentSession = module.getCurrentSession
  })

  describe('getCurrentUser', () => {
    it('returns current user when authenticated', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const user = await getCurrentUser()
      expect(user).toEqual(mockUser)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    })

    it('returns null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const user = await getCurrentUser()
      expect(user).toBeNull()
    })

    it('handles user fetch errors', async () => {
      const mockError = new Error('Failed to fetch user')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const user = await getCurrentUser()
      expect(user).toBeNull()
    })
  })

  describe('getCurrentSession', () => {
    it('returns current session when authenticated', async () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: { id: '123', email: 'test@example.com' },
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const session = await getCurrentSession()
      expect(session).toEqual(mockSession)
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
    })

    it('returns null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const session = await getCurrentSession()
      expect(session).toBeNull()
    })

    it('handles session fetch errors', async () => {
      const mockError = new Error('Failed to fetch session')
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      })

      const session = await getCurrentSession()
      expect(session).toBeNull()
    })
  })

  describe('Auth State Monitoring', () => {
    it('sets up auth state change listener in browser environment', () => {
      // Mock window object
      Object.defineProperty(global, 'window', {
        value: {
          localStorage: {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
          },
        },
        writable: true,
      })

      // Re-import to trigger window check
      jest.resetModules()
      process.env = { ...process.env, ...mockEnvVars }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
      
      require('@/lib/supabase')

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it('handles sign in events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      Object.defineProperty(global, 'window', {
        value: { localStorage: {} },
        writable: true,
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        // Simulate SIGNED_IN event
        callback('SIGNED_IN', {
          user: { email: 'test@example.com' },
          access_token: 'token',
        })
        return { 
          data: { 
            subscription: {
              unsubscribe: jest.fn(),
            }
          }
        }
      })

      jest.resetModules()
      process.env = { ...process.env, ...mockEnvVars }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
      require('@/lib/supabase')

      expect(consoleSpy).toHaveBeenCalledWith('User signed in:', 'test@example.com')
      
      consoleSpy.mockRestore()
    })

    it('handles sign out events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      Object.defineProperty(global, 'window', {
        value: { localStorage: {} },
        writable: true,
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        // Simulate SIGNED_OUT event
        callback('SIGNED_OUT', null)
        return { 
          data: { 
            subscription: {
              unsubscribe: jest.fn(),
            }
          }
        }
      })

      jest.resetModules()
      process.env = { ...process.env, ...mockEnvVars }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
      require('@/lib/supabase')

      expect(consoleSpy).toHaveBeenCalledWith('User signed out')
      
      consoleSpy.mockRestore()
    })
  })
})
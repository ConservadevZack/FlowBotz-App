"use client"

import { createContext, useContext } from 'react'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const authValue = {
    user: null,
    session: null,
    loading: false,
    signOut: async () => {
      console.log('Sign out called')
    }
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}
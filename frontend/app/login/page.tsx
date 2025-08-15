"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FloatingNavbar from '@/components/FloatingNavbar'
import { authService } from '@/lib/auth'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    const result = await authService.signIn(formData.email, formData.password)
    
    if (result.success) {
      router.push('/dashboard')
    } else {
      setErrors({ general: result.error || 'Login failed' })
    }
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    const { supabase } = await import('@/lib/supabase')
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        setErrors({ general: 'Failed to initiate Google sign-in' })
      }
    } catch (error) {
      setErrors({ general: 'Failed to initiate Google sign-in' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-12">
      <FloatingNavbar />
      {/* Moving background */}
      <div className="cosmic-moving-background">
        <div className="cosmic-orb cosmic-orb-1"></div>
        <div className="cosmic-orb cosmic-orb-2"></div>
        <div className="cosmic-orb cosmic-orb-3"></div>
        <div className="cosmic-orb cosmic-orb-4"></div>
        <div className="cosmic-orb cosmic-orb-5"></div>
      </div>

      <div className="max-w-lg w-full mx-auto px-4 relative z-10">
        <div className="cosmic-card-premium text-center cosmic-animate-page-enter p-8 sm:p-10 border border-white/20">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl cosmic-text-gradient mb-6 font-bold">
              Welcome Back
            </h1>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-md mx-auto">
              Sign in to continue creating amazing AI designs
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="mb-8 p-5 bg-red-500/15 border-2 border-red-500/30 flex items-center gap-4 cosmic-animate-fade-in rounded-xl" role="alert" aria-live="polite">
              <span className="text-red-400 flex-shrink-0 text-xl">⚠️</span>
              <span className="text-red-400 text-base font-semibold">{errors.general}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-base font-semibold mb-3 text-left">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 text-lg">✉️</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`cosmic-input-premium cosmic-focus-ring w-full pl-12 pr-4 py-4 text-base font-medium min-h-[56px] ${
                    errors.email 
                      ? 'cosmic-error border-red-500/50 bg-red-500/10' 
                      : ''
                  }`}
                  placeholder="Enter your email"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  autoComplete="email"
                  required
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-3 text-base text-red-400 text-left cosmic-animate-fade-in font-semibold" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-base font-semibold mb-3 text-left">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 text-lg">🔒</span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`cosmic-input-premium cosmic-focus-ring w-full pl-12 pr-16 py-4 text-base font-medium min-h-[56px] ${
                    errors.password 
                      ? 'cosmic-error border-red-500/50 bg-red-500/10' 
                      : ''
                  }`}
                  placeholder="Enter your password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-300 p-1 rounded cosmic-focus-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <span className="text-xl">🙈</span>
                  ) : (
                    <span className="text-xl">👁️</span>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-3 text-base text-red-400 text-left cosmic-animate-fade-in font-semibold" role="alert">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="cosmic-checkbox w-5 h-5"
                />
                <span className="ml-3 text-base text-white/80 font-medium group-hover:text-white transition-colors duration-300">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-base text-purple-300 hover:text-purple-200 transition-colors duration-300 font-semibold cosmic-focus-ring rounded px-2 py-1">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full cosmic-button-premium cosmic-button-xl cosmic-focus-ring disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg min-h-[64px] shadow-2xl hover:scale-105 transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <div className="cosmic-spinner mr-3"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <span className="mr-3">🔑</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-white/20"></div>
            <div className="px-6 text-white/70 text-base font-semibold">Or continue with</div>
            <div className="flex-1 border-t border-white/20"></div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              className="w-full cosmic-button cosmic-button-glass cosmic-focus-ring flex items-center justify-center gap-4 min-h-[56px] font-semibold text-base border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button className="w-full cosmic-button cosmic-button-glass cosmic-focus-ring flex items-center justify-center gap-4 min-h-[56px] font-semibold text-base border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-white/80 text-base font-medium">
              Don't have an account?{' '}
              <Link href="/signup" className="text-purple-300 hover:text-purple-200 transition-colors font-bold cosmic-focus-ring rounded px-2 py-1">
                Sign up for free →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
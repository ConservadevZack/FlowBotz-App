/**
 * Security utilities for input sanitization and validation
 * Protects against XSS, injection attacks, and malicious input
 */

// HTML entities to escape XSS attacks
const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '&': '&amp;'
}

// SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
  /(\bOR\b|\bAND\b).*[=<>]/i,
  /UNION.*SELECT/i,
  /DROP\s+TABLE/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /UPDATE.*SET/i,
  /--/,
  /\/\*/,
  /\*\//,
  /;.*--/,
  /'\s*OR\s*'1'\s*=\s*'1/i,
  /1'\s*OR\s*'1'\s*=\s*'1/i
]

// XSS patterns to detect and block
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /<style/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi
]

// Dangerous characters and sequences
const DANGEROUS_CHARS = ['<', '>', '"', "'", '&', '`', '\\']

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input.replace(/[<>"'&/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Validate and sanitize AI prompts
 * Allows creative content while blocking dangerous patterns
 */
export function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return ''
  }

  // Remove null bytes and control characters
  let sanitized = prompt.replace(/[\x00-\x1F\x7F]/g, '')

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Invalid prompt: Contains potentially harmful content')
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  // Limit length to prevent DoS
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000)
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

/**
 * Sanitize user input for form fields
 */
export function sanitizeInput(input: string, options: {
  allowHTML?: boolean
  maxLength?: number
  removeLineBreaks?: boolean
} = {}): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const { allowHTML = false, maxLength = 1000, removeLineBreaks = false } = options

  let sanitized = input

  // Remove null bytes and dangerous control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Remove line breaks if requested
  if (removeLineBreaks) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ')
  }

  // HTML escape if not allowing HTML
  if (!allowHTML) {
    sanitized = sanitizeHTML(sanitized)
  }

  // Check for dangerous patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Invalid input: Contains potentially harmful content')
    }
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // Clean up whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

/**
 * Validate email format and sanitize
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Remove dangerous characters
  let sanitized = email.toLowerCase().trim()
  
  // Basic email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!emailPattern.test(sanitized)) {
    throw new Error('Invalid email format')
  }

  // Additional security checks
  if (sanitized.includes('..') || sanitized.includes('@@')) {
    throw new Error('Invalid email format')
  }

  return sanitized
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  let sanitized = url.trim()

  // Allow only safe protocols
  const allowedProtocols = ['http:', 'https:', 'data:image/', 'blob:']
  const hasValidProtocol = allowedProtocols.some(protocol => 
    sanitized.toLowerCase().startsWith(protocol)
  )

  if (!hasValidProtocol && sanitized.includes(':')) {
    throw new Error('Invalid URL: Unsupported protocol')
  }

  // Block dangerous patterns
  if (/javascript:|vbscript:|data:(?!image\/)/i.test(sanitized)) {
    throw new Error('Invalid URL: Contains potentially harmful content')
  }

  return sanitized
}

/**
 * Rate limiting check for security
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  /**
   * Check if action is allowed based on rate limiting
   */
  checkRateLimit(
    identifier: string, 
    maxAttempts: number = 10, 
    windowMs: number = 60000
  ): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.attempts.has(identifier)) {
      this.attempts.set(identifier, [])
    }
    
    const attempts = this.attempts.get(identifier)!
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => time > windowStart)
    
    if (recentAttempts.length >= maxAttempts) {
      return false
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.attempts.set(identifier, recentAttempts)
    
    return true
  }

  /**
   * Clear rate limit for identifier
   */
  clearRateLimit(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter()

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File): boolean {
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large: Maximum size is 10MB')
  }

  // Allowed image types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type: Only images are allowed')
  }

  // Check for dangerous file extensions
  const extension = file.name.toLowerCase().split('.').pop()
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'js', 'vbs']
  
  if (!extension || dangerousExtensions.includes(extension)) {
    throw new Error('Invalid file: Dangerous file type detected')
  }

  return true
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Content Security Policy helper
 */
export function createCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
    "style-src 'self' 'unsafe-inline'", // Needed for styled components
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://api.stability.ai https://api.replicate.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': createCSPHeader()
}
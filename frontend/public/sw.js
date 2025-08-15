/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FLOWBOTZ SERVICE WORKER
 * Advanced caching strategies for offline functionality
 * Performance optimization with intelligent cache management
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'flowbotz-v1.2.0'
const STATIC_CACHE = `${CACHE_NAME}-static`
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`
const IMAGE_CACHE = `${CACHE_NAME}-images`
const API_CACHE = `${CACHE_NAME}-api`

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  '/_next/static/css/',
  '/_next/static/js/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/dashboard',
  '/create',
  '/gallery',
  '/my-designs'
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/designs',
  '/api/templates',
  '/api/user/profile'
]

// Maximum cache sizes (in MB)
const MAX_CACHE_SIZE = {
  static: 50,
  dynamic: 30,
  images: 100,
  api: 20
}

// Cache duration in milliseconds
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 24 * 60 * 60 * 1000,    // 1 day
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
  api: 60 * 60 * 1000               // 1 hour
}

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).catch((error) => {
      console.error('[SW] Failed to cache static assets:', error)
    })
  )
  
  // Force activation of new service worker
  self.skipWaiting()
})

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  )
})

/**
 * Fetch Event Handler with Advanced Caching Strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { url, method } = request
  
  // Only handle GET requests
  if (method !== 'GET') return
  
  // Skip chrome-extension and non-http requests
  if (!url.startsWith('http')) return
  
  event.respondWith(handleRequest(request))
})

/**
 * Request Handler with Intelligent Caching
 */
async function handleRequest(request) {
  const { url, destination } = request
  
  try {
    // Handle different resource types
    if (destination === 'image') {
      return handleImageRequest(request)
    } else if (isAPIRequest(url)) {
      return handleAPIRequest(request)
    } else if (isStaticAsset(url)) {
      return handleStaticAssetRequest(request)
    } else if (isNavigationRequest(request)) {
      return handleNavigationRequest(request)
    } else {
      return handleDynamicRequest(request)
    }
  } catch (error) {
    console.error('[SW] Request handling failed:', error)
    return handleOfflineFallback(request)
  }
}

/**
 * Image Request Handler - Cache First Strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  
  if (cached && !isExpired(cached, CACHE_DURATION.images)) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Clone for caching
      const responseClone = response.clone()
      await cache.put(request, responseClone)
      await maintainCacheSize(IMAGE_CACHE, MAX_CACHE_SIZE.images)
    }
    return response
  } catch (error) {
    // Return cached version even if expired
    if (cached) return cached
    throw error
  }
}

/**
 * API Request Handler - Network First with Cache Fallback
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE)
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const responseClone = response.clone()
      await cache.put(request, responseClone)
      await maintainCacheSize(API_CACHE, MAX_CACHE_SIZE.api)
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached && !isExpired(cached, CACHE_DURATION.api)) {
      // Add offline indicator header
      const offlineResponse = new Response(cached.body, {
        ...cached,
        headers: {
          ...cached.headers,
          'X-Served-From': 'cache',
          'X-Offline': 'true'
        }
      })
      return offlineResponse
    }
    throw error
  }
}

/**
 * Static Asset Handler - Cache First Strategy
 */
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  
  if (cached) return cached
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const responseClone = response.clone()
      await cache.put(request, responseClone)
    }
    return response
  } catch (error) {
    if (cached) return cached
    throw error
  }
}

/**
 * Navigation Request Handler - Network First with Offline Fallback
 */
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      const responseClone = response.clone()
      await cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    // Try cached version
    const cache = await caches.open(DYNAMIC_CACHE)
    const cached = await cache.match(request)
    
    if (cached) return cached
    
    // Fallback to offline page for supported routes
    if (isOfflineRoute(request.url)) {
      return caches.match('/offline')
    }
    
    throw error
  }
}

/**
 * Dynamic Content Handler - Stale While Revalidate
 */
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cached = await cache.match(request)
  
  // Return cached immediately, fetch in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const responseClone = response.clone()
      await cache.put(request, responseClone)
      await maintainCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE.dynamic)
    }
    return response
  }).catch(() => cached)
  
  return cached || await fetchPromise
}

/**
 * Utility Functions
 */
function isAPIRequest(url) {
  return CACHEABLE_APIS.some(api => url.includes(api)) || 
         url.includes('/api/') ||
         url.includes('supabase.co')
}

function isStaticAsset(url) {
  return url.includes('/_next/static/') ||
         url.includes('/static/') ||
         url.includes('/icons/') ||
         url.endsWith('.js') ||
         url.endsWith('.css') ||
         url.endsWith('.woff2') ||
         url.endsWith('.woff')
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'))
}

function isOfflineRoute(url) {
  return OFFLINE_ROUTES.some(route => {
    const urlPath = new URL(url).pathname
    return urlPath === route || urlPath.startsWith(`${route}/`)
  })
}

function isExpired(response, maxAge) {
  const date = response.headers.get('date')
  if (!date) return false
  
  const responseTime = new Date(date).getTime()
  return (Date.now() - responseTime) > maxAge
}

async function maintainCacheSize(cacheName, maxSizeMB) {
  const cache = await caches.open(cacheName)
  const requests = await cache.keys()
  
  if (requests.length < 50) return // Only check when we have many entries
  
  let totalSize = 0
  const entries = []
  
  for (const request of requests) {
    const response = await cache.match(request)
    if (response) {
      const size = parseInt(response.headers.get('content-length') || '0')
      totalSize += size
      entries.push({ request, size, date: response.headers.get('date') })
    }
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  
  if (totalSize > maxSizeBytes) {
    // Sort by date (oldest first)
    entries.sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // Remove oldest entries until under size limit
    let removedSize = 0
    for (const entry of entries) {
      await cache.delete(entry.request)
      removedSize += entry.size
      if (totalSize - removedSize <= maxSizeBytes) break
    }
    
    console.log(`[SW] Cache ${cacheName} cleaned: removed ${removedSize / 1024 / 1024}MB`)
  }
}

async function handleOfflineFallback(request) {
  // For navigation requests, show offline page
  if (isNavigationRequest(request)) {
    return caches.match('/offline') || new Response(
      '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
  
  // For other requests, return a minimal error response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  })
}

/**
 * Background Sync for Offline Actions
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  console.log('[SW] Performing background sync...')
  
  try {
    // Sync offline design saves, uploads, etc.
    // Implementation would depend on your specific offline functionality
    
    // Example: Retry failed design saves
    const cache = await caches.open(API_CACHE)
    const failedSaves = await getFailedSaves() // Your implementation
    
    for (const save of failedSaves) {
      try {
        await fetch(save.url, save.options)
        await removeFailedSave(save.id) // Your implementation
      } catch (error) {
        console.log('[SW] Sync failed for:', save.id)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Placeholder functions - implement based on your needs
async function getFailedSaves() { return [] }
async function removeFailedSave(id) { return true }

/**
 * Push Notifications (optional)
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  
  const options = {
    body: data.body || 'New update available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'general',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open FlowBotz'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'FlowBotz', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
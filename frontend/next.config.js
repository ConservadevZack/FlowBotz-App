/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'vpfphtrjvomejsxjmxut.supabase.co',
      'images.unsplash.com',
      'cdn.printful.com',
      'cdn.printify.com'
    ],
  },
  // Fix for webpack chunk loading "Cannot read properties of undefined (reading 'call')" error
  webpack: (config, { dev, isServer }) => {
    // Disable webpack module splitting that causes the factory error
    if (dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Create a single chunk for all modules to avoid factory function errors
          bundle: {
            name: 'bundle',
            chunks: 'all',
            enforce: true
          }
        }
      }
    }
    return config
  },
  // Disable experimental features that can cause RSC webpack issues
  experimental: {
    serverComponentsExternalPackages: [],
  }
}

module.exports = nextConfig
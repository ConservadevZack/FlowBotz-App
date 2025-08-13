import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cosmic-deep-space': '#0B1426',
        'cosmic-purple': '#6366F1',
        'cosmic-pink': '#EC4899',
        'cosmic-blue': '#3B82F6',
        'cosmic-green': '#10B981',
        'cosmic-gold': '#F59E0B',
        'cosmic-space-gray': '#1F2937',
        'cosmic-star-white': '#F9FAFB',
        'cosmic-void-black': '#030712',
        'cosmic-asteroid-gray': '#374151',
        'cosmic-comet-silver': '#D1D5DB',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'monospace'],
      },
      animation: {
        'cosmic-float-1': 'cosmic-float-1 8s infinite ease-in-out alternate',
        'cosmic-float-2': 'cosmic-float-2 12s infinite ease-in-out alternate',
        'cosmic-float-3': 'cosmic-float-3 10s infinite ease-in-out alternate',
        'cosmic-float-4': 'cosmic-float-4 14s infinite ease-in-out alternate',
        'cosmic-float-5': 'cosmic-float-5 16s infinite ease-in-out alternate',
        'cosmic-drift': 'cosmic-drift 120s linear infinite',
        'cosmic-pulse': 'cosmic-pulse 3s ease-in-out infinite',
        'stellar-glow': 'stellar-glow 4s ease-in-out infinite',
        'nebula-shimmer': 'nebula-shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}

export default config
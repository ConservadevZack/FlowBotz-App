"use client"

import React from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROFESSIONAL DESIGN SYSTEM CORE
 * Industry-standard design tokens and component architecture
 * Built for FlowBotz Creator Studio Professional Edition
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Professional Design Tokens
export const DesignTokens = {
  // Spacing System (based on 8px grid)
  spacing: {
    px: '1px',
    0: '0',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px'
  },

  // Professional Typography Scale
  typography: {
    fontSizes: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
      '8xl': '6rem',      // 96px
      '9xl': '8rem'       // 128px
    },
    fontWeights: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },
    lineHeights: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },

  // Professional Color Palette
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#f0f4ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b'
    },
    
    // Secondary Colors
    secondary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
      950: '#500724'
    },

    // Neutral Grays
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712'
    },

    // Semantic Colors
    success: {
      50: '#f0fdf4',
      500: '#10b981',
      900: '#064e3b'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d'
    },
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    }
  },

  // Professional Shadows
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    
    // Glass shadows for professional tools
    glass: {
      subtle: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      moderate: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      strong: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.15)'
    }
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },

  // Animation & Transitions
  transitions: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms'
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
}

// Professional Breakpoints
export const Breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Component Size Variants
export const ComponentSizes = {
  xs: {
    height: '24px',
    padding: '4px 8px',
    fontSize: '12px'
  },
  sm: {
    height: '32px',
    padding: '6px 12px',
    fontSize: '14px'
  },
  md: {
    height: '40px',
    padding: '8px 16px',
    fontSize: '16px'
  },
  lg: {
    height: '48px',
    padding: '12px 20px',
    fontSize: '18px'
  },
  xl: {
    height: '56px',
    padding: '16px 24px',
    fontSize: '20px'
  }
}

// Professional Glass Effects
export const GlassEffects = {
  subtle: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(8px) saturate(150%)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  light: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.15)'
  },
  medium: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  strong: {
    background: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(24px) saturate(200%)',
    border: '1px solid rgba(255, 255, 255, 0.25)'
  }
}

// Professional Design Tool Categories
export const DesignToolCategories = {
  selection: {
    name: 'Selection',
    icon: '⚡',
    tools: ['select', 'direct-select', 'group-select']
  },
  drawing: {
    name: 'Drawing',
    icon: '✏️',
    tools: ['pen', 'pencil', 'brush', 'vector-brush']
  },
  shapes: {
    name: 'Shapes',
    icon: '⬜',
    tools: ['rectangle', 'ellipse', 'polygon', 'star', 'line', 'arrow']
  },
  text: {
    name: 'Text',
    icon: '📝',
    tools: ['text', 'heading', 'paragraph', 'list']
  },
  images: {
    name: 'Images',
    icon: '🖼️',
    tools: ['image', 'crop', 'mask', 'effects']
  },
  layout: {
    name: 'Layout',
    icon: '📐',
    tools: ['frame', 'grid', 'columns', 'guides']
  }
}

// Professional Asset Categories
export const AssetCategories = {
  icons: {
    name: 'Icons',
    count: 10000,
    categories: ['ui', 'social', 'business', 'tech', 'nature', 'abstract']
  },
  shapes: {
    name: 'Shapes',
    count: 500,
    categories: ['basic', 'geometric', 'organic', 'arrows', 'badges']
  },
  illustrations: {
    name: 'Illustrations',
    count: 2000,
    categories: ['business', 'tech', 'lifestyle', 'abstract', '3d']
  },
  patterns: {
    name: 'Patterns',
    count: 300,
    categories: ['geometric', 'organic', 'textured', 'minimal']
  },
  backgrounds: {
    name: 'Backgrounds',
    count: 1000,
    categories: ['gradients', 'textures', 'abstract', 'photography']
  }
}

export default DesignTokens
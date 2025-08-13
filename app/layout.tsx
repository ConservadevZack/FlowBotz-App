import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FlowBotz - AI-Powered Design & Print-on-Demand Platform',
  description: 'Create stunning designs with AI and order custom products instantly. Transform your ideas into reality with FlowBotz.',
  keywords: 'AI design, print on demand, custom products, AI art generator, POD platform',
  authors: [{ name: 'FlowBotz' }],
  openGraph: {
    title: 'FlowBotz - AI-Powered Design Platform',
    description: 'Create stunning designs with AI and order custom products instantly.',
    type: 'website',
    locale: 'en_US',
    siteName: 'FlowBotz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowBotz - AI-Powered Design Platform',
    description: 'Create stunning designs with AI and order custom products instantly.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0B1426',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning>
        {/* Animated Background Orbs */}
        <div className="cosmic-moving-background">
          <div className="cosmic-orb cosmic-orb-1" />
          <div className="cosmic-orb cosmic-orb-2" />
          <div className="cosmic-orb cosmic-orb-3" />
          <div className="cosmic-orb cosmic-orb-4" />
          <div className="cosmic-orb cosmic-orb-5" />
        </div>
        
        {/* Backdrop blur layer */}
        <div className="cosmic-backdrop-blur" />
        
        {/* Main Content */}
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
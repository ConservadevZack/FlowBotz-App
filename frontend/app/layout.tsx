import type { Metadata } from 'next'
import AnimatedBackground from '../components/AnimatedBackground'

export const metadata: Metadata = {
  title: 'FlowBotz - AI-Powered Design Platform',
  description: 'Create stunning designs with AI and order custom products instantly.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script src="/sw-cleanup.js" defer />
      </head>
      <body 
        style={{ 
          margin: 0, 
          padding: 0, 
          backgroundColor: '#0B1426', 
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
        suppressHydrationWarning={true}
      >
        <AnimatedBackground />
        <div id="__next">
          {children}
        </div>
      </body>
    </html>
  )
}
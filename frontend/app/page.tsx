import Link from 'next/link'
import Navigation from './components/Navigation'

export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Navigation />

      {/* Main Content */}
      <main style={{ paddingTop: '80px' }}>
        {/* Hero Section */}
        <section style={{
          padding: '80px 24px 120px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{
              fontSize: '72px',
              fontWeight: 'bold',
              marginBottom: '24px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: '1.1'
            }}>
              AI-Powered Design Studio
            </h1>
            
            <p style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '48px',
              lineHeight: '1.5'
            }}>
              Create stunning designs with artificial intelligence and transform them into custom products instantly
            </p>

            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/create" style={{
                padding: '16px 32px',
                background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                Start Creating →
              </Link>
              
              <Link href="/gallery" style={{
                padding: '16px 32px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                View Gallery
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: '80px 24px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#fff'
              }}>
                Powerful AI Features
              </h2>
              <p style={{
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Advanced artificial intelligence tools to enhance your creative workflow
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '32px'
            }}>
              {[
                {
                  icon: '🚀',
                  title: 'Smart Prompt Optimizer',
                  description: 'AI-powered prompt enhancement with 6 optimization categories for better results',
                  color: '#8B5CF6'
                },
                {
                  icon: '🎭',
                  title: 'Style Presets Library',
                  description: 'Professional style presets with custom creation and usage tracking',
                  color: '#EC4899'
                },
                {
                  icon: '📝',
                  title: 'Template Collection',
                  description: '50+ professional templates across logos, characters, products, and more',
                  color: '#06B6D4'
                },
                {
                  icon: '🎯',
                  title: 'Batch Generator',
                  description: 'Multi-model batch processing with real-time progress and variations',
                  color: '#10B981'
                },
                {
                  icon: '📚',
                  title: 'Design History',
                  description: 'Complete version control with project management and collaboration',
                  color: '#F59E0B'
                },
                {
                  icon: '💳',
                  title: 'Print-on-Demand',
                  description: 'Seamless Stripe integration with subscriptions and instant product creation',
                  color: '#EF4444'
                }
              ].map((feature, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(16px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '32px',
                  transition: 'transform 0.2s, border-color 0.2s, backdrop-filter 0.2s',
                  willChange: 'transform, backdrop-filter'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: feature.color,
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.6',
                    textAlign: 'center'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(3px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(3px) saturate(1.3)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: '40px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#fff'
            }}>
              Ready to Create?
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '32px'
            }}>
              Join thousands of creators using FlowBotz to bring their ideas to life
            </p>
            <Link href="/create" style={{
              padding: '16px 32px',
              background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
              borderRadius: '8px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '600',
              display: 'inline-block'
            }}>
              Start Creating Now →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '32px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px'
            }}>
              © 2024 FlowBotz. Enterprise AI-Powered Design Platform.
            </div>
            <div style={{
              display: 'flex',
              gap: '24px',
              fontSize: '14px'
            }}>
              <Link href="/privacy" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>
                Privacy
              </Link>
              <Link href="/terms" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>
                Terms
              </Link>
              <Link href="/contact" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
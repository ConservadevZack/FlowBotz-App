import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock FloatingNavbar component
jest.mock('@/components/FloatingNavbar', () => {
  return function MockFloatingNavbar() {
    return <nav data-testid="floating-navbar">Mocked FloatingNavbar</nav>
  }
})

// Mock AuthProvider since FloatingNavbar depends on it
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signOut: jest.fn(),
  })),
}))

describe('HomePage', () => {
  it('renders the main hero section', () => {
    render(<HomePage />)
    
    // Check if the floating navbar is rendered
    expect(screen.getByTestId('floating-navbar')).toBeInTheDocument()
    
    // Check for key hero content
    expect(screen.getByText('AI-Powered Design Creation')).toBeInTheDocument()
    
    // Check for main CTA elements
    const getStartedLinks = screen.getAllByText(/Get Started|Start Creating/i)
    expect(getStartedLinks.length).toBeGreaterThan(0)
  })

  it('renders cosmic particles for visual effects', () => {
    render(<HomePage />)
    
    // Check if cosmic particles container exists
    const particlesContainer = document.querySelector('.cosmic-particles')
    expect(particlesContainer).toBeInTheDocument()
    
    // Should have 20 particles
    const particles = document.querySelectorAll('.cosmic-particle')
    expect(particles).toHaveLength(20)
  })

  it('has proper semantic structure', () => {
    render(<HomePage />)
    
    // Should have main section elements
    const sections = document.querySelectorAll('section')
    expect(sections.length).toBeGreaterThan(0)
    
    // Should have proper heading hierarchy
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
  })

  it('includes navigation links', () => {
    render(<HomePage />)
    
    // Should have links to key pages
    const links = document.querySelectorAll('a[href]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders visual icons and elements', () => {
    render(<HomePage />)
    
    // Check for Lucide icons being rendered (they render as SVGs)
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })
})
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FloatingNavbar from '@/components/FloatingNavbar'

// Mock the AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signOut: jest.fn(),
  })),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}))

describe('FloatingNavbar', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Reset AuthProvider mock to default state
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: jest.fn(),
    })
  })

  it('renders navigation items for public users', () => {
    render(<FloatingNavbar />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    
    // Should not show authenticated items
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Creator')).not.toBeInTheDocument()
  })

  it('renders navigation items for authenticated users', () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
      signOut: jest.fn(),
    })

    render(<FloatingNavbar />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Creator')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('My Designs')).toBeInTheDocument()
    
    // Should not show public-only items like Home and Pricing
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Pricing')).not.toBeInTheDocument()
  })

  it('handles mobile menu toggle', async () => {
    render(<FloatingNavbar />)
    
    // Verify we have the basic elements first
    expect(screen.getByText('Gallery')).toBeInTheDocument() // Should always be visible
    
    // Find and click the mobile menu button (hamburger menu)
    const menuButton = screen.getByText('☰')
    fireEvent.click(menuButton)
    
    // Mobile menu should be visible now - look for additional instances
    await waitFor(() => {
      // The mobile menu should now show duplicate navigation items
      const galleryLinks = screen.getAllByText('Gallery')
      expect(galleryLinks.length).toBeGreaterThanOrEqual(2) // Desktop + mobile versions
    })
    
    // Click the X to close
    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)
    
    // Mobile menu should be hidden again
    await waitFor(() => {
      const galleryLinks = screen.getAllByText('Gallery')
      expect(galleryLinks).toHaveLength(1) // Only desktop version
    })
  })

  it('handles scroll state changes', async () => {
    render(<FloatingNavbar />)
    
    // Simulate scroll event
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true })
    fireEvent.scroll(window)
    
    await waitFor(() => {
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('top-2')
    })
  })

  it('handles sign out for authenticated users', async () => {
    const mockSignOut = jest.fn()
    const mockPush = jest.fn()
    
    const { useAuth } = require('@/components/AuthProvider')
    const { useRouter } = require('next/navigation')
    
    useAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
      signOut: mockSignOut,
    })
    
    useRouter.mockReturnValue({
      push: mockPush,
    })

    render(<FloatingNavbar />)
    
    // Find and click sign out button
    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)
    
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows loading state when authentication is loading', () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
      signOut: jest.fn(),
    })

    render(<FloatingNavbar />)
    
    // When loading, should still render basic navigation but maybe without user-specific items
    // The component doesn't seem to have a specific loading state, so it renders the public nav
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Gallery')).toBeInTheDocument()
    expect(screen.getByText('Pricing')).toBeInTheDocument()
  })
})
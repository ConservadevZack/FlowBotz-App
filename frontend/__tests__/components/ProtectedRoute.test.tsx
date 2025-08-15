import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ProtectedRoute from '@/components/ProtectedRoute'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}))

describe('ProtectedRoute', () => {
  const TestChild = () => <div data-testid="protected-content">Protected Content</div>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state when authentication is loading', () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    expect(screen.getByText('Verifying authentication...')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('shows timeout message after 3 seconds of loading', async () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Initially no timeout message
    expect(screen.queryByText('Taking longer than expected...')).not.toBeInTheDocument()

    // After 3 seconds, timeout message should appear
    await waitFor(() => {
      expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument()
    }, { timeout: 3500 })

    // Should show "Go to Login" button
    expect(screen.getByText('Go to Login')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', async () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Should not render protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()

    // Should redirect to login after a short delay
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('redirects to custom route when specified', async () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <TestChild />
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login')
    })
  })

  it('renders children when user is authenticated', () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('Verifying authentication...')).not.toBeInTheDocument()
  })

  it('handles go to login button click', async () => {
    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    // Mock window.location.href
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Wait for timeout message
    await waitFor(() => {
      expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument()
    }, { timeout: 3500 })

    const goToLoginButton = screen.getByText('Go to Login')
    fireEvent.click(goToLoginButton)

    expect(mockLocation.href).toBe('/login')
  })

  it('shows dev bypass button in development environment', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Wait for timeout message
    await waitFor(() => {
      expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument()
    }, { timeout: 3500 })

    expect(screen.getByText('Dev Bypass')).toBeInTheDocument()

    // Restore environment
    process.env.NODE_ENV = originalEnv
  })

  it('handles dev bypass button click', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    // Mock localStorage and window.location.reload
    const mockSetItem = jest.fn()
    const mockReload = jest.fn()
    Object.defineProperty(window, 'localStorage', {
      value: { setItem: mockSetItem },
      writable: true,
    })
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Wait for timeout message
    await waitFor(() => {
      expect(screen.getByText('Dev Bypass')).toBeInTheDocument()
    }, { timeout: 3500 })

    const devBypassButton = screen.getByText('Dev Bypass')
    fireEvent.click(devBypassButton)

    expect(mockSetItem).toHaveBeenCalledWith('dev_auth_bypass', 'true')
    expect(mockReload).toHaveBeenCalled()

    // Restore environment
    process.env.NODE_ENV = originalEnv
  })

  it('hides dev bypass button in production environment', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const { useAuth } = require('@/components/AuthProvider')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <TestChild />
      </ProtectedRoute>
    )

    // Wait for timeout message
    await waitFor(() => {
      expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument()
    }, { timeout: 3500 })

    expect(screen.queryByText('Dev Bypass')).not.toBeInTheDocument()

    // Restore environment
    process.env.NODE_ENV = originalEnv
  })
})
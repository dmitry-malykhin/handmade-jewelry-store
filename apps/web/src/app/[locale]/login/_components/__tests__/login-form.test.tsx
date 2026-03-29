import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { LoginForm } from '../login-form'

const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/store/auth.store', () => {
  const mockSetTokens = vi.fn()
  return {
    useAuthStore: (selector: (state: { setTokens: typeof mockSetTokens }) => unknown) =>
      selector({ setTokens: mockSetTokens }),
    _mockSetTokens: mockSetTokens,
  }
})

async function getMockSetTokens() {
  const authStoreModule = await import('@/store/auth.store')
  return (authStoreModule as unknown as { _mockSetTokens: ReturnType<typeof vi.fn> })._mockSetTokens
}

beforeEach(() => {
  mockRouterPush.mockClear()
})

describe('LoginForm — rendering', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders the submit button with "Sign In" label', () => {
    render(<LoginForm />)

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('does not show an error message on initial render', () => {
    render(<LoginForm />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the password input as type="password" by default', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('renders the show-password button with aria-label "Show password"', () => {
    render(<LoginForm />)

    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
  })
})

describe('LoginForm — password visibility toggle', () => {
  it('changes password input type to "text" when show-password button is clicked', async () => {
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('changes aria-label to "Hide password" after toggling visibility on', async () => {
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('restores password input type to "password" when toggled off', async () => {
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})

describe('LoginForm — successful login', () => {
  it('calls setTokens with the returned tokens and redirects to home', async () => {
    const mockSetTokens = await getMockSetTokens()
    mockSetTokens.mockClear()

    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith('access-token', 'refresh-token')
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/')
  })

  it('shows the submitting label while the request is in flight', async () => {
    server.use(
      http.post('http://localhost:4000/api/auth/login', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({ accessToken: 'access-token', refreshToken: 'refresh-token' })
      }),
    )

    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Signing in…' })).toBeInTheDocument()
    })
  })
})

describe('LoginForm — error handling', () => {
  it('shows "invalid credentials" error when API returns 401', async () => {
    server.use(
      http.post('http://localhost:4000/api/auth/login', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }),
    )

    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.')
    })
  })

  it('shows generic error message when API returns an unexpected error', async () => {
    server.use(
      http.post('http://localhost:4000/api/auth/login', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })
      }),
    )

    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    })
  })

  it('re-enables the submit button after a failed request', async () => {
    server.use(
      http.post('http://localhost:4000/api/auth/login', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }),
    )

    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled()
    })
  })
})

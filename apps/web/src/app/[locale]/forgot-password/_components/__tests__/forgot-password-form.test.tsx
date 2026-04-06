import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from '../forgot-password-form'
import * as authApi from '@/lib/api/auth'

vi.mock('@/lib/api/auth', () => ({
  forgotPassword: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockForgotPassword = vi.mocked(authApi.forgotPassword)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPasswordForm — rendering', () => {
  it('renders email input and submit button', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders back to sign in link', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
  })
})

describe('ForgotPasswordForm — submission', () => {
  it('calls forgotPassword with the entered email on submit', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockResolvedValue(undefined)

    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('shows success state after submission regardless of API outcome', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockResolvedValue(undefined)

    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument()
  })

  it('shows success state even when API throws an error', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockRejectedValue(new Error('Network error'))

    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from '../reset-password-form'
import * as authApi from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

vi.mock('@/lib/api/auth', () => ({
  resetPassword: vi.fn(),
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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: vi.fn(),
}))

import { useSearchParams } from 'next/navigation'
const mockUseSearchParams = vi.mocked(useSearchParams)

const mockResetPassword = vi.mocked(authApi.resetPassword)

beforeEach(() => {
  vi.clearAllMocks()
})

function setupSearchParamsWith(token: string | null) {
  mockUseSearchParams.mockReturnValue({
    get: (key: string) => (key === 'token' ? token : null),
  } as ReturnType<typeof useSearchParams>)
}

describe('ResetPasswordForm — invalid token', () => {
  it('shows error state and back link when token is missing', () => {
    setupSearchParamsWith(null)

    render(<ResetPasswordForm />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument()
  })
})

describe('ResetPasswordForm — rendering with valid token', () => {
  beforeEach(() => {
    setupSearchParamsWith('valid-reset-token')
  })

  it('renders new password and confirm password inputs', () => {
    render(<ResetPasswordForm />)

    expect(screen.getByLabelText('New password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ResetPasswordForm />)

    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })
})

describe('ResetPasswordForm — validation', () => {
  beforeEach(() => {
    setupSearchParamsWith('valid-reset-token')
  })

  it('shows mismatch error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'password123')
    await user.type(screen.getByLabelText('Confirm new password'), 'differentpassword')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/passwords do not match/i)
    expect(mockResetPassword).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordForm — submission', () => {
  beforeEach(() => {
    setupSearchParamsWith('valid-reset-token')
  })

  it('calls resetPassword with token and new password on valid submit', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockResolvedValue(undefined)

    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'newsecurepassword')
    await user.type(screen.getByLabelText('Confirm new password'), 'newsecurepassword')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid-reset-token', 'newsecurepassword')
    })
  })

  it('redirects to login page after successful password reset', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockResolvedValue(undefined)

    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'newsecurepassword')
    await user.type(screen.getByLabelText('Confirm new password'), 'newsecurepassword')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('shows API error message when reset fails with ApiError', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockRejectedValue(
      new ApiError(400, 'Invalid or expired password reset token'),
    )

    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'newsecurepassword')
    await user.type(screen.getByLabelText('Confirm new password'), 'newsecurepassword')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired/i)
  })
})

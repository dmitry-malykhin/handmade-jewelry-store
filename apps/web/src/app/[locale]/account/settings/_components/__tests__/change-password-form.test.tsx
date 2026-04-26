import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockChangePassword = vi.fn()
vi.mock('@/lib/api/auth', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-access-token' }),
}))

import { toast } from 'sonner'
import { ChangePasswordForm } from '../change-password-form'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all three password fields', () => {
    renderWithIntl(<ChangePasswordForm />)

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
  })

  it('shows error when new passwords do not match', async () => {
    renderWithIntl(<ChangePasswordForm />)

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass123' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewStrong123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'DifferentPass123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('shows error when new password is too weak', async () => {
    renderWithIntl(<ChangePasswordForm />)

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass123' },
    })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'short' },
    })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('calls changePassword API on valid submission', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined)
    renderWithIntl(<ChangePasswordForm />)

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass123' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewStrong123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewStrong123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith(
        'test-access-token',
        'CurrentPass123',
        'NewStrong123',
      ),
    )
  })

  it('shows success toast after password update', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined)
    renderWithIntl(<ChangePasswordForm />)

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'CurrentPass123' },
    })
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewStrong123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewStrong123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })
})

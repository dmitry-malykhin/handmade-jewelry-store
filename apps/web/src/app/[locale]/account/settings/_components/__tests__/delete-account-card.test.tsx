import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockDeleteOwnAccount = vi.fn()
vi.mock('@/lib/api/users', () => ({
  deleteOwnAccount: (...args: unknown[]) => mockDeleteOwnAccount(...args),
}))

const mockRouterPush = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockClearTokens = vi.fn()
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (
    selector: (state: { accessToken: string | null; clearTokens: () => void }) => unknown,
  ) => selector({ accessToken: 'test-access-token', clearTokens: mockClearTokens }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from 'sonner'
import { ApiError } from '@/lib/api/client'
import { DeleteAccountCard } from '../delete-account-card'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('delete-account-card')
  await $allureSeverity('critical')
})

describe('DeleteAccountCard (#642 GDPR Art. 17)', () => {
  function openModal() {
    renderWithIntl(<DeleteAccountCard />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
  }

  function fillForm({ password, phrase }: { password: string; phrase: string }) {
    fireEvent.change(screen.getByLabelText(/Current password/i), { target: { value: password } })
    fireEvent.change(screen.getByLabelText(/Type DELETE MY ACCOUNT/i), {
      target: { value: phrase },
    })
  }

  function submit() {
    fireEvent.click(screen.getByRole('button', { name: /^Delete account$/i }))
  }

  it('renders the destructive card with an open-modal button', () => {
    renderWithIntl(<DeleteAccountCard />)
    expect(screen.getByRole('heading', { name: /Delete your account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete my account/i })).toBeInTheDocument()
  })

  it('blocks submit when the confirmation phrase does not match exactly', () => {
    openModal()
    fillForm({ password: 'correct-horse', phrase: 'delete my account' })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent(
      /The confirmation phrase must match exactly/i,
    )
    expect(mockDeleteOwnAccount).not.toHaveBeenCalled()
  })

  it('calls deleteOwnAccount, clears tokens, and navigates home on success', async () => {
    mockDeleteOwnAccount.mockResolvedValueOnce(undefined)

    openModal()
    fillForm({ password: 'correct-horse', phrase: 'DELETE MY ACCOUNT' })
    submit()

    await waitFor(() =>
      expect(mockDeleteOwnAccount).toHaveBeenCalledWith(
        'test-access-token',
        'correct-horse',
        'DELETE MY ACCOUNT',
      ),
    )
    expect(mockClearTokens).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith('/')
    expect(toast.success).toHaveBeenCalled()
  })

  it('surfaces a specific error on 403 (wrong password / phrase) without logging out', async () => {
    mockDeleteOwnAccount.mockRejectedValueOnce(new ApiError(403, 'Forbidden'))

    openModal()
    fillForm({ password: 'wrong', phrase: 'DELETE MY ACCOUNT' })
    submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /The password or confirmation phrase is incorrect/i,
      ),
    )
    expect(mockClearTokens).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('surfaces a generic error on unexpected failures', async () => {
    mockDeleteOwnAccount.mockRejectedValueOnce(new Error('offline'))

    openModal()
    fillForm({ password: 'correct-horse', phrase: 'DELETE MY ACCOUNT' })
    submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not delete your account/i),
    )
  })
})

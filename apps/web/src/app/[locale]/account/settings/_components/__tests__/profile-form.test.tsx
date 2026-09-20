import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockFetchProfile = vi.fn()
const mockUpdateProfile = vi.fn()
vi.mock('@/lib/api/users', () => ({
  fetchProfile: (...args: unknown[]) => mockFetchProfile(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-access-token' }),
}))

import { toast } from 'sonner'
import { ProfileForm } from '../profile-form'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('profile-form')
  await $allureSeverity('normal')
})

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads profile and pre-fills the name and phone inputs', async () => {
    mockFetchProfile.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ada',
      phone: '+34123',
    })

    renderWithIntl(<ProfileForm />)

    await waitFor(() => expect(mockFetchProfile).toHaveBeenCalledWith('test-access-token'))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ada')
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('+34123')
  })

  it('renders email as read-only', async () => {
    mockFetchProfile.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      phone: null,
    })

    renderWithIntl(<ProfileForm />)

    const emailInput = (await screen.findByLabelText('Email')) as HTMLInputElement
    expect(emailInput.readOnly).toBe(true)
    expect(emailInput.value).toBe('a@b.com')
  })

  it('submits updated name and phone and shows a success toast', async () => {
    mockFetchProfile.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      name: '',
      phone: '',
    })
    mockUpdateProfile.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ada Lovelace',
      phone: '+34999',
    })

    renderWithIntl(<ProfileForm />)

    await waitFor(() => expect(mockFetchProfile).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+34999' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith('test-access-token', {
        name: 'Ada Lovelace',
        phone: '+34999',
      }),
    )
    expect(toast.success).toHaveBeenCalled()
  })
})

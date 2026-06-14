import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as SiteSettingsApiModule from '@/lib/api/site-settings'
import { SettingsForm } from '../settings-form'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const fetchAdminSiteSettingsMock = vi.fn()
const updateAdminSiteSettingsMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('@/lib/api/site-settings', async () => {
  const actual = await vi.importActual<typeof SiteSettingsApiModule>('@/lib/api/site-settings')
  return {
    ...actual,
    fetchAdminSiteSettings: (...args: unknown[]) => fetchAdminSiteSettingsMock(...args),
    updateAdminSiteSettings: (...args: unknown[]) => updateAdminSiteSettingsMock(...args),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toastSuccessMock(message),
    error: (message: string) => toastErrorMock(message),
  },
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

const baseSettings = {
  id: 'default',
  storeName: 'Senichka',
  tagline: 'Handmade Beaded Jewelry',
  contactEmail: 'hi@senichka.com',
  supportEmail: '',
  instagramUrl: 'https://instagram.com/senichka',
  pinterestUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  returnPolicyDays: 30,
  estimatedDeliveryMinDays: 3,
  estimatedDeliveryMaxDays: 7,
  freeShippingThresholdCents: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('settings-form')
  await $allureSeverity('normal')
})

describe('SettingsForm', () => {
  beforeEach(() => {
    fetchAdminSiteSettingsMock.mockReset()
    updateAdminSiteSettingsMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('renders all three section headings after settings load', async () => {
    fetchAdminSiteSettingsMock.mockResolvedValueOnce(baseSettings)

    render(<SettingsForm />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /General/i })).toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: /Social links/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Shipping & returns/i })).toBeInTheDocument()
  })

  it('seeds inputs with current settings values', async () => {
    fetchAdminSiteSettingsMock.mockResolvedValueOnce(baseSettings)

    render(<SettingsForm />)

    await waitFor(() => expect(screen.getByDisplayValue('Senichka')).toBeInTheDocument())
    expect(screen.getByDisplayValue('hi@senichka.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://instagram.com/senichka')).toBeInTheDocument()
  })

  it('saves the General section payload only when its Save button is clicked', async () => {
    fetchAdminSiteSettingsMock.mockResolvedValueOnce(baseSettings)
    updateAdminSiteSettingsMock.mockResolvedValueOnce({ ...baseSettings, storeName: 'New Name' })

    render(<SettingsForm />)

    await waitFor(() => expect(screen.getByDisplayValue('Senichka')).toBeInTheDocument())
    const storeNameInput = screen.getByDisplayValue('Senichka')
    await userEvent.clear(storeNameInput)
    await userEvent.type(storeNameInput, 'New Name')

    // Each section has its own Save button — General is the first
    const [firstSaveButton] = screen.getAllByRole('button', { name: /Save changes/i })
    if (!firstSaveButton) throw new Error('Expected at least one Save button to render')
    await userEvent.click(firstSaveButton)

    await waitFor(() => expect(updateAdminSiteSettingsMock).toHaveBeenCalled())
    const [payload] = updateAdminSiteSettingsMock.mock.calls[0]!
    // General section only — no shipping or social fields
    expect(payload).toMatchObject({ storeName: 'New Name' })
    expect(payload).not.toHaveProperty('estimatedDeliveryMinDays')
    expect(payload).not.toHaveProperty('instagramUrl')
  })

  it('shows error toast when save fails', async () => {
    fetchAdminSiteSettingsMock.mockResolvedValueOnce(baseSettings)
    updateAdminSiteSettingsMock.mockRejectedValueOnce(new Error('500'))

    render(<SettingsForm />)

    await waitFor(() => expect(screen.getByDisplayValue('Senichka')).toBeInTheDocument())
    const [firstSaveButton] = screen.getAllByRole('button', { name: /Save changes/i })
    if (!firstSaveButton) throw new Error('Expected at least one Save button to render')
    await userEvent.click(firstSaveButton)

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})

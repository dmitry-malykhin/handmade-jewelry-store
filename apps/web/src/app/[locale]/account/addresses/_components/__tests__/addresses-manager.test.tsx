import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockFetchMyAddresses = vi.fn()
const mockDeleteAddress = vi.fn()
const mockSetDefaultAddress = vi.fn()

vi.mock('@/lib/api/addresses', () => ({
  fetchMyAddresses: (...args: unknown[]) => mockFetchMyAddresses(...args),
  deleteAddress: (...args: unknown[]) => mockDeleteAddress(...args),
  setDefaultAddress: (...args: unknown[]) => mockSetDefaultAddress(...args),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { AddressesManager } from '../addresses-manager'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const sampleAddress = {
  id: 'addr-1',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'NYC',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  phone: null,
  isDefault: true,
  createdAt: '2026-04-20T10:00:00.000Z',
  updatedAt: '2026-04-20T10:00:00.000Z',
}

describe('AddressesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no addresses', async () => {
    mockFetchMyAddresses.mockResolvedValueOnce([])
    renderWithIntl(<AddressesManager />)

    expect(await screen.findByText(/no saved addresses yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add new address/i })).toBeInTheDocument()
  })

  it('renders address card with default badge', async () => {
    mockFetchMyAddresses.mockResolvedValueOnce([sampleAddress])
    renderWithIntl(<AddressesManager />)

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  it('does not show "Set as default" button on already-default address', async () => {
    mockFetchMyAddresses.mockResolvedValueOnce([sampleAddress])
    renderWithIntl(<AddressesManager />)

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /set as default/i })).not.toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockFetchMyAddresses.mockRejectedValueOnce(new Error('Network error'))
    renderWithIntl(<AddressesManager />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
  })

  it('disables "Add new address" when 5 addresses exist', async () => {
    const addresses = Array.from({ length: 5 }, (_, i) => ({
      ...sampleAddress,
      id: `addr-${i}`,
      isDefault: i === 0,
    }))
    mockFetchMyAddresses.mockResolvedValueOnce(addresses)
    renderWithIntl(<AddressesManager />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add new address/i })).toBeDisabled(),
    )
    expect(screen.getByText(/maximum 5 addresses/i)).toBeInTheDocument()
  })
})

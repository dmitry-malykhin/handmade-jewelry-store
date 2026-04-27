import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockFetchMyOrders = vi.fn()
vi.mock('@/lib/api/orders', () => ({
  fetchMyOrders: (...args: unknown[]) => mockFetchMyOrders(...args),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

import { OrderHistoryList } from '../order-history-list'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const sampleOrder = {
  id: 'order-abc12345',
  status: 'PAID' as const,
  subtotal: 90,
  shippingCost: 5,
  total: 95,
  guestEmail: null,
  shippingAddress: {
    fullName: 'Jane Doe',
    addressLine1: '123 Main St',
    city: 'NYC',
    postalCode: '10001',
    country: 'US',
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 2,
      price: 45,
      productSnapshot: { title: 'Beaded Bracelet', slug: 'bracelet' },
    },
  ],
  createdAt: '2026-04-20T10:00:00.000Z',
  updatedAt: '2026-04-20T10:00:00.000Z',
}

describe('OrderHistoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeleton while loading', () => {
    mockFetchMyOrders.mockReturnValue(new Promise(() => undefined))
    renderWithIntl(<OrderHistoryList />)

    expect(screen.getByRole('list', { name: /loading orders/i })).toBeInTheDocument()
  })

  it('renders empty state with browse CTA when no orders', async () => {
    mockFetchMyOrders.mockResolvedValueOnce([])
    renderWithIntl(<OrderHistoryList />)

    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse jewelry/i })).toBeInTheDocument()
  })

  it('renders order with status badge and total', async () => {
    mockFetchMyOrders.mockResolvedValueOnce([sampleOrder])
    renderWithIntl(<OrderHistoryList />)

    await waitFor(() => expect(screen.getByText('Paid')).toBeInTheDocument())
    expect(screen.getByText(/\$95/)).toBeInTheDocument()
    // Order ID prefix shown as monospace #ORDER-AB
    expect(screen.getByText(/#ORDER-AB/)).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    mockFetchMyOrders.mockRejectedValueOnce(new Error('Network error'))
    renderWithIntl(<OrderHistoryList />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
  })
})

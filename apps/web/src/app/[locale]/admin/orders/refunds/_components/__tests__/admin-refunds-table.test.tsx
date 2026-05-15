import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import type * as OrdersApiModule from '@/lib/api/orders'
import { AdminRefundsTable } from '../admin-refunds-table'

const fetchAdminRefundsMock = vi.fn()

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof OrdersApiModule>('@/lib/api/orders')
  return {
    ...actual,
    fetchAdminRefunds: () => fetchAdminRefundsMock(),
  }
})

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const fullRefund = {
  id: 'order_abcdef1234567890',
  status: 'REFUNDED',
  total: 100,
  shippingCost: 5,
  subtotal: 95,
  shippingAddress: {
    fullName: 'Jane',
    addressLine1: 'x',
    city: 'NYC',
    postalCode: '1',
    country: 'US',
  },
  items: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-10T00:00:00Z',
  guestEmail: 'jane@example.com',
  refundAmount: 100,
  refundedAt: '2026-05-10T12:00:00Z',
  refundReason: 'ITEM_DAMAGED',
  refundNote: null,
}

describe('AdminRefundsTable', () => {
  beforeEach(() => {
    fetchAdminRefundsMock.mockReset()
  })

  it('renders the empty state when there are no refunds', async () => {
    fetchAdminRefundsMock.mockResolvedValueOnce([])

    render(<AdminRefundsTable />)

    await waitFor(() => expect(screen.getByText(/No refunds yet/i)).toBeInTheDocument())
  })

  it('renders refund rows with order id (last 8 chars), customer, amount, reason', async () => {
    fetchAdminRefundsMock.mockResolvedValueOnce([fullRefund])

    render(<AdminRefundsTable />)

    await waitFor(() => expect(screen.getByText(/34567890/)).toBeInTheDocument())
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText(/Item damaged/i)).toBeInTheDocument()
  })

  it('links each row back to the order detail page', async () => {
    fetchAdminRefundsMock.mockResolvedValueOnce([fullRefund])

    render(<AdminRefundsTable />)

    await waitFor(() => expect(screen.getByText(/34567890/)).toBeInTheDocument())
    const orderLink = screen.getByText(/34567890/).closest('a')
    expect(orderLink).toHaveAttribute('href', expect.stringContaining('order_abcdef1234567890'))
  })

  it('shows dash placeholders when refund metadata is missing on a partial-refund row', async () => {
    fetchAdminRefundsMock.mockResolvedValueOnce([
      {
        ...fullRefund,
        refundReason: null,
        refundedAt: null,
        refundAmount: 0,
        guestEmail: null,
      },
    ])

    render(<AdminRefundsTable />)

    await waitFor(() => expect(screen.getByText('$0.00')).toBeInTheDocument())
    // 3 dashes: customer email, reason, refundedAt
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })
})

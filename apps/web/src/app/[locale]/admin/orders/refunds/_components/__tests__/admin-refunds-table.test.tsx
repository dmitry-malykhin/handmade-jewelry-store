import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as OrdersApiModule from '@/lib/api/orders'
import { AdminRefundsTable } from '../admin-refunds-table'

const fetchAdminRefundsMock = vi.fn()
const routerReplaceMock = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof OrdersApiModule>('@/lib/api/orders')
  return {
    ...actual,
    fetchAdminRefunds: (params: OrdersApiModule.AdminRefundsQueryParams, accessToken: string) =>
      fetchAdminRefundsMock(params, accessToken),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
  usePathname: () => '/en/admin/orders/refunds',
  useSearchParams: () => mockSearchParams,
}))

// jsdom does not implement Radix's pointer-events APIs — required by Select
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

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

describe('AdminRefundsTable — base rendering', () => {
  beforeEach(() => {
    fetchAdminRefundsMock.mockReset()
    routerReplaceMock.mockReset()
    mockSearchParams = new URLSearchParams()
  })

  it('renders the unfiltered empty state when there are no refunds', async () => {
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
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })
})

describe('AdminRefundsTable — filters', () => {
  beforeEach(() => {
    fetchAdminRefundsMock.mockReset()
    routerReplaceMock.mockReset()
    mockSearchParams = new URLSearchParams()
  })

  it('reads filters from the URL searchParams on first render', async () => {
    mockSearchParams = new URLSearchParams({
      from: '2026-05-01',
      to: '2026-05-31',
      reason: 'ITEM_DAMAGED',
      customer: 'alice',
    })
    fetchAdminRefundsMock.mockResolvedValueOnce([])

    render(<AdminRefundsTable />)

    await waitFor(() =>
      expect(fetchAdminRefundsMock).toHaveBeenCalledWith(
        {
          from: '2026-05-01',
          to: '2026-05-31',
          reason: 'ITEM_DAMAGED',
          customer: 'alice',
        },
        'test-token',
      ),
    )
  })

  it('writes the from-date filter to the URL when changed', async () => {
    const user = userEvent.setup()
    fetchAdminRefundsMock.mockResolvedValue([])

    render(<AdminRefundsTable />)

    const fromInput = screen.getByLabelText(/refunded from/i)
    await user.type(fromInput, '2026-05-01')

    await waitFor(() => {
      const lastCall = routerReplaceMock.mock.calls.at(-1)?.[0] as string
      expect(lastCall).toContain('from=2026-05-01')
    })
  })

  it('shows the Clear filters button when at least one filter is active', async () => {
    mockSearchParams = new URLSearchParams({ reason: 'ITEM_DAMAGED' })
    fetchAdminRefundsMock.mockResolvedValueOnce([])

    render(<AdminRefundsTable />)

    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeInTheDocument()
  })

  it('hides the Clear filters button when no filters are active', async () => {
    fetchAdminRefundsMock.mockResolvedValueOnce([])

    render(<AdminRefundsTable />)

    // Wait for at least one async render cycle to settle
    await waitFor(() => expect(fetchAdminRefundsMock).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()
  })

  it('renders the filtered empty state when no refunds match the active filters', async () => {
    mockSearchParams = new URLSearchParams({ reason: 'OTHER' })
    fetchAdminRefundsMock.mockResolvedValueOnce([])

    render(<AdminRefundsTable />)

    expect(await screen.findByText(/no refunds match these filters/i)).toBeInTheDocument()
  })

  it('clearing filters calls router.replace with the bare pathname', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams({ reason: 'ITEM_DAMAGED' })
    fetchAdminRefundsMock.mockResolvedValue([])

    render(<AdminRefundsTable />)

    const clearButton = await screen.findByRole('button', { name: /clear filters/i })
    await user.click(clearButton)

    expect(routerReplaceMock).toHaveBeenCalledWith(
      '/en/admin/orders/refunds',
      expect.objectContaining({ scroll: false }),
    )
  })
})

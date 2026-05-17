import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import type * as OrdersApiModule from '@/lib/api/orders'
import { ProductionTable } from '../production-table'

const DAY_MS = 24 * 60 * 60 * 1000
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString()
}

const fetchAdminProductionQueueMock = vi.fn()
const updateAdminOrderProductionMock = vi.fn()

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof OrdersApiModule>('@/lib/api/orders')
  return {
    ...actual,
    fetchAdminProductionQueue: () => fetchAdminProductionQueueMock(),
    updateAdminOrderProduction: (...args: unknown[]) => updateAdminOrderProductionMock(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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

function buildQueueItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_abcdef1234567890',
    status: 'PAID',
    total: 100,
    subtotal: 95,
    shippingCost: 5,
    shippingAddress: {
      fullName: 'Jane',
      addressLine1: 'x',
      city: 'NYC',
      postalCode: '1',
      country: 'US',
    },
    items: [
      {
        id: 'i1',
        quantity: 1,
        price: 100,
        productSnapshot: { title: 'Garnet Pendant' },
      },
    ],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    guestEmail: 'jane@example.com',
    productionStatus: 'QUEUED',
    productionNotes: null,
    productionDeadlineAt: new Date('2099-01-01T00:00:00Z').toISOString(),
    maxProductionDays: 7,
    ...overrides,
  }
}

describe('ProductionTable', () => {
  beforeEach(() => {
    fetchAdminProductionQueueMock.mockReset()
    updateAdminOrderProductionMock.mockReset()
  })

  it('renders the empty state when the queue is empty', async () => {
    fetchAdminProductionQueueMock.mockResolvedValueOnce([])

    render(<ProductionTable />)

    await waitFor(() =>
      expect(screen.getByText(/No made-to-order pieces in queue/i)).toBeInTheDocument(),
    )
  })

  it('renders order id (last 8 uppercase) and customer email for each queue item', async () => {
    fetchAdminProductionQueueMock.mockResolvedValueOnce([buildQueueItem()])

    render(<ProductionTable />)

    await waitFor(() => expect(screen.getByText(/34567890/)).toBeInTheDocument())
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('shows overdue badge when deadline is in the past', async () => {
    fetchAdminProductionQueueMock.mockResolvedValueOnce([
      buildQueueItem({ productionDeadlineAt: daysFromNow(-2) }),
    ])

    render(<ProductionTable />)

    await waitFor(() => expect(screen.getByText(/Overdue/i)).toBeInTheDocument())
  })

  it('shows "due today" badge when deadline is within the next 24h but not full day', async () => {
    fetchAdminProductionQueueMock.mockResolvedValueOnce([
      buildQueueItem({
        // 12 hours from now → days floor = 0 → "Due today"
        productionDeadlineAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      }),
    ])

    render(<ProductionTable />)

    await waitFor(() => expect(screen.getByText(/Due today/i)).toBeInTheDocument())
  })

  it('shows days-left chip when deadline is in the future', async () => {
    // 5 full days + 1h cushion so floor(...) lands on 5 even with test-runtime drift.
    fetchAdminProductionQueueMock.mockResolvedValueOnce([
      buildQueueItem({
        productionDeadlineAt: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ).toISOString(),
      }),
    ])

    render(<ProductionTable />)

    await waitFor(() => expect(screen.getByText(/5 day/i)).toBeInTheDocument())
  })
})

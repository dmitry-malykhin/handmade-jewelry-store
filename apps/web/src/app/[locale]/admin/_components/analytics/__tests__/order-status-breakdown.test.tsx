import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { OrderStatusBreakdown } from '../order-status-breakdown'
import * as adminApi from '@/lib/api/admin'

vi.mock('@/lib/api/admin', () => ({
  fetchAdminOrderStatusBreakdown: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: 'mock-token' }),
}))

// recharts uses ResizeObserver internally
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-container">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: () => null,
    Cell: () => null,
    Tooltip: () => null,
  }
})

const mockFetchBreakdown = vi.mocked(adminApi.fetchAdminOrderStatusBreakdown)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrderStatusBreakdown', () => {
  it('renders the full status legend with counts including zero buckets', async () => {
    mockFetchBreakdown.mockResolvedValue([
      { status: 'PENDING', count: 0 },
      { status: 'PAID', count: 3 },
      { status: 'PROCESSING', count: 0 },
      { status: 'SHIPPED', count: 1 },
      { status: 'DELIVERED', count: 7 },
      { status: 'CANCELLED', count: 0 },
      { status: 'REFUNDED', count: 0 },
      { status: 'PARTIALLY_REFUNDED', count: 0 },
    ])

    render(<OrderStatusBreakdown period="30d" />)

    // Pending and Delivered should both show even though Pending has 0
    expect(await screen.findByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders the empty state when total count is zero', async () => {
    mockFetchBreakdown.mockResolvedValue([
      { status: 'PENDING', count: 0 },
      { status: 'PAID', count: 0 },
      { status: 'PROCESSING', count: 0 },
      { status: 'SHIPPED', count: 0 },
      { status: 'DELIVERED', count: 0 },
      { status: 'CANCELLED', count: 0 },
      { status: 'REFUNDED', count: 0 },
      { status: 'PARTIALLY_REFUNDED', count: 0 },
    ])

    render(<OrderStatusBreakdown period="30d" />)

    expect(await screen.findByText('No orders in this period.')).toBeInTheDocument()
  })

  it('shows the loading state until data arrives', () => {
    mockFetchBreakdown.mockImplementation(() => new Promise(() => {}))

    render(<OrderStatusBreakdown period="30d" />)

    expect(screen.getByText('Loading order statuses…')).toBeInTheDocument()
  })

  it('passes the period to the API client', async () => {
    mockFetchBreakdown.mockResolvedValue([
      { status: 'PENDING', count: 0 },
      { status: 'PAID', count: 0 },
      { status: 'PROCESSING', count: 0 },
      { status: 'SHIPPED', count: 0 },
      { status: 'DELIVERED', count: 0 },
      { status: 'CANCELLED', count: 0 },
      { status: 'REFUNDED', count: 0 },
      { status: 'PARTIALLY_REFUNDED', count: 0 },
    ])

    render(<OrderStatusBreakdown period="90d" />)

    await screen.findByText('No orders in this period.')
    expect(mockFetchBreakdown).toHaveBeenCalledWith('90d', 'mock-token')
  })
})

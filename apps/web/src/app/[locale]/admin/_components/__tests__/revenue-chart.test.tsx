import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { RevenueChart } from '../revenue-chart'
import * as adminApi from '@/lib/api/admin'

vi.mock('@/lib/api/admin', () => ({
  fetchAdminRevenueStats: vi.fn(),
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

// ResponsiveContainer doesn't work in jsdom — stub recharts chart components
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-container">{children}</div>
    ),
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    Area: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  }
})

const mockFetchAdminRevenueStats = vi.mocked(adminApi.fetchAdminRevenueStats)

const emptyRevenueStats = {
  totalRevenueCents: 0,
  orderCount: 0,
  avgOrderValueCents: 0,
  chartData: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-03-${String(index + 1).padStart(2, '0')}`,
    revenueCents: 0,
  })),
}

const revenueStatsWithData = {
  totalRevenueCents: 25000,
  orderCount: 5,
  avgOrderValueCents: 5000,
  chartData: [
    { date: '2026-04-01', revenueCents: 10000 },
    { date: '2026-04-02', revenueCents: 15000 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RevenueChart — rendering', () => {
  it('renders chart title', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(revenueStatsWithData)

    render(<RevenueChart />)

    expect(await screen.findByText('Revenue')).toBeInTheDocument()
  })

  it('renders all four period selector buttons', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    expect(await screen.findByRole('button', { name: '7 days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30 days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90 days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 year' })).toBeInTheDocument()
  })

  it('shows 30 days period as selected by default', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    const button = await screen.findByRole('button', { name: '30 days' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders summary row with total revenue, order count and avg order', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(revenueStatsWithData)

    render(<RevenueChart />)

    expect(await screen.findByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('shows empty state when all chart data points are zero', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    expect(await screen.findByText('No revenue data for this period.')).toBeInTheDocument()
  })

  it('shows loading state while data is being fetched', () => {
    mockFetchAdminRevenueStats.mockImplementation(() => new Promise(() => {}))

    render(<RevenueChart />)

    expect(screen.getByText('Loading chart…')).toBeInTheDocument()
  })
})

describe('RevenueChart — period selector', () => {
  it('fetches data with default 30d period on mount', async () => {
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    await waitFor(() => {
      expect(mockFetchAdminRevenueStats).toHaveBeenCalledWith('30d', 'mock-token')
    })
  })

  it('fetches data with new period when period button is clicked', async () => {
    const user = userEvent.setup()
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    await screen.findByRole('button', { name: '7 days' })
    await user.click(screen.getByRole('button', { name: '7 days' }))

    await waitFor(() => {
      expect(mockFetchAdminRevenueStats).toHaveBeenCalledWith('7d', 'mock-token')
    })
  })

  it('marks clicked period button as selected', async () => {
    const user = userEvent.setup()
    mockFetchAdminRevenueStats.mockResolvedValue(emptyRevenueStats)

    render(<RevenueChart />)

    await screen.findByRole('button', { name: '7 days' })
    await user.click(screen.getByRole('button', { name: '7 days' }))

    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'false')
  })
})

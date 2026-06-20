import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { KeyMetricsCards } from '../key-metrics-cards'
import * as adminApi from '@/lib/api/admin'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/api/admin', () => ({
  fetchAdminKeyMetrics: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: 'mock-token' }),
}))

const mockFetchAdminKeyMetrics = vi.mocked(adminApi.fetchAdminKeyMetrics)

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('key-metrics-cards')
  await $allureSeverity('normal')
})

describe('KeyMetricsCards', () => {
  it('renders all four metric labels', async () => {
    mockFetchAdminKeyMetrics.mockResolvedValue({
      newCustomers: 5,
      returningCustomers: 12,
      refundRatePercent: 3,
      avgDaysOrderToDelivery: 7,
    })

    render(<KeyMetricsCards period="30d" />)

    expect(await screen.findByText('New customers')).toBeInTheDocument()
    expect(screen.getByText('Returning customers')).toBeInTheDocument()
    expect(screen.getByText('Refund rate')).toBeInTheDocument()
    expect(screen.getByText('Avg. days to delivery')).toBeInTheDocument()
  })

  it('renders raw values with proper formatting', async () => {
    mockFetchAdminKeyMetrics.mockResolvedValue({
      newCustomers: 42,
      returningCustomers: 17,
      refundRatePercent: 8,
      avgDaysOrderToDelivery: 5,
    })

    render(<KeyMetricsCards period="30d" />)

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('17')).toBeInTheDocument()
    expect(screen.getByText('8%')).toBeInTheDocument()
    expect(screen.getByText('5 days')).toBeInTheDocument()
  })

  it('passes the selected period to the API client', async () => {
    mockFetchAdminKeyMetrics.mockResolvedValue({
      newCustomers: 0,
      returningCustomers: 0,
      refundRatePercent: 0,
      avgDaysOrderToDelivery: 0,
    })

    render(<KeyMetricsCards period="7d" />)

    await screen.findByText('New customers')
    expect(mockFetchAdminKeyMetrics).toHaveBeenCalledWith('7d', 'mock-token')
  })

  it('shows placeholder while data is loading', () => {
    mockFetchAdminKeyMetrics.mockImplementation(() => new Promise(() => {}))

    render(<KeyMetricsCards period="30d" />)

    const placeholders = screen.getAllByText('…')
    expect(placeholders).toHaveLength(4)
  })
})

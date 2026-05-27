import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { LoyaltyOverview } from '../loyalty-overview'
import { fetchLoyaltyBalance, fetchLoyaltyTransactions } from '@/lib/api/loyalty'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/lib/api/loyalty', () => ({
  fetchLoyaltyBalance: vi.fn(),
  fetchLoyaltyTransactions: vi.fn(),
}))

const mockFetchBalance = vi.mocked(fetchLoyaltyBalance)
const mockFetchTransactions = vi.mocked(fetchLoyaltyTransactions)

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    accessToken: 'test-token',
    refreshToken: null,
    isAuthenticated: true,
    role: 'USER',
  })
})

describe('LoyaltyOverview', () => {
  it('renders the balance in points and dollar-worth', async () => {
    mockFetchBalance.mockResolvedValue({ balance: 250 })
    mockFetchTransactions.mockResolvedValue([])

    render(<LoyaltyOverview />)

    await waitFor(() => expect(screen.getByText('250')).toBeInTheDocument())
    // 250 points = $2.50
    expect(screen.getByText(/\$2\.50/)).toBeInTheDocument()
  })

  it('renders empty state when there are no transactions', async () => {
    mockFetchBalance.mockResolvedValue({ balance: 0 })
    mockFetchTransactions.mockResolvedValue([])

    render(<LoyaltyOverview />)

    expect(await screen.findByText(/first earned points/i)).toBeInTheDocument()
  })

  it('renders a transaction with a positive sign for EARNED', async () => {
    mockFetchBalance.mockResolvedValue({ balance: 68 })
    mockFetchTransactions.mockResolvedValue([
      {
        id: 'tx-1',
        points: 68,
        type: 'EARNED',
        orderId: 'order-abc',
        note: 'Order abc delivered',
        createdAt: '2026-05-19T00:00:00.000Z',
      },
    ])

    render(<LoyaltyOverview />)

    await waitFor(() => expect(screen.getByText('+68')).toBeInTheDocument())
    expect(screen.getByText('Order abc delivered')).toBeInTheDocument()
  })

  it('renders SPENT and REVERSED as negative values', async () => {
    mockFetchBalance.mockResolvedValue({ balance: 0 })
    mockFetchTransactions.mockResolvedValue([
      {
        id: 'tx-1',
        points: -500,
        type: 'SPENT',
        orderId: 'order-1',
        note: null,
        createdAt: '2026-05-19T00:00:00.000Z',
      },
      {
        id: 'tx-2',
        points: -68,
        type: 'REVERSED',
        orderId: 'order-2',
        note: null,
        createdAt: '2026-05-18T00:00:00.000Z',
      },
    ])

    render(<LoyaltyOverview />)

    await waitFor(() => expect(screen.getByText('-500')).toBeInTheDocument())
    expect(screen.getByText('-68')).toBeInTheDocument()
  })
})

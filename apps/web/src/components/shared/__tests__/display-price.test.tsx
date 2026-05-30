import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { DisplayPrice } from '../display-price'
import { useCurrencyStore } from '@/store/currency.store'
import { fetchExchangeRates } from '@/lib/api/exchange-rates'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/api/exchange-rates', () => ({
  fetchExchangeRates: vi.fn(),
}))

const mockFetchExchangeRates = vi.mocked(fetchExchangeRates)

beforeEach(() => {
  useCurrencyStore.setState({ displayCurrency: 'USD' })
  mockFetchExchangeRates.mockReset()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('display-price')
  await $allureSeverity('normal')
})

describe('DisplayPrice — USD (no conversion)', () => {
  it('renders the USD amount as $X.XX', async () => {
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    render(<DisplayPrice amountUsd={68} />)
    expect(await screen.findByText('$68.00')).toBeInTheDocument()
  })

  it('does not show the approximation asterisk for USD', async () => {
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    render(<DisplayPrice amountUsd={68} />)
    await screen.findByText('$68.00')
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('keeps the canonical USD value on the <data> element for analytics/SEO', async () => {
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    const { container } = render(<DisplayPrice amountUsd={68} />)
    await screen.findByText('$68.00')
    const dataElement = container.querySelector('data')
    expect(dataElement?.getAttribute('value')).toBe('68')
  })
})

describe('DisplayPrice — CAD/GBP (conversion + approximation hint)', () => {
  it('renders converted CAD with the approximation asterisk', async () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    render(<DisplayPrice amountUsd={68} />)
    expect(await screen.findByText('CA$92.48')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders converted GBP', async () => {
    useCurrencyStore.setState({ displayCurrency: 'GBP' })
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    render(<DisplayPrice amountUsd={100} />)
    expect(await screen.findByText('£79.00')).toBeInTheDocument()
  })

  it('hides the asterisk when hideApproximationHint=true', async () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: false,
    })

    render(<DisplayPrice amountUsd={68} hideApproximationHint />)
    await screen.findByText('CA$92.48')
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })
})

describe('DisplayPrice — fallback when rates unavailable', () => {
  it('shows USD as safe placeholder while rates are still loading', async () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    // Pending forever — exercises the "no data yet" branch
    mockFetchExchangeRates.mockReturnValue(new Promise(() => {}))

    render(<DisplayPrice amountUsd={68} />)
    expect(await screen.findByText('$68.00')).toBeInTheDocument()
  })

  it('marks the price approximate when API serves stale rates', async () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.36, GBP: 0.79 },
      fetchedAt: '2026-05-25T00:00:00.000Z',
      stale: true,
    })

    render(<DisplayPrice amountUsd={68} />)
    await waitFor(() => expect(screen.getByText('CA$92.48')).toBeInTheDocument())
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})

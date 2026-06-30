import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { useFormattedPrice } from '../useFormattedPrice'
import { useCurrencyStore } from '@/store/currency.store'
import { fetchExchangeRates } from '@/lib/api/exchange-rates'

vi.mock('@/lib/api/exchange-rates', () => ({ fetchExchangeRates: vi.fn() }))
vi.mock('@/store/currency.store', () => ({ useCurrencyStore: vi.fn() }))

const mockFetchExchangeRates = vi.mocked(fetchExchangeRates)
const mockUseCurrencyStore = vi.mocked(useCurrencyStore)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function setCurrency(currency: 'USD' | 'CAD' | 'GBP'): void {
  mockUseCurrencyStore.mockImplementation((selector) =>
    selector({ displayCurrency: currency } as Parameters<typeof selector>[0]),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/hooks')
  await $allureSubSuite('useFormattedPrice')
  await $allureSeverity('normal')
})

describe('useFormattedPrice', () => {
  it('returns a USD placeholder during the first paint before exchange rates resolve', () => {
    setCurrency('CAD')
    mockFetchExchangeRates.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useFormattedPrice(49.99), { wrapper })

    expect(result.current.currency).toBe('USD')
    expect(result.current.formatted).toContain('$')
    expect(result.current.isApproximate).toBe(false)
  })

  it('formats in USD as exact (not approximate) when displayCurrency is USD', async () => {
    setCurrency('USD')
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.35, GBP: 0.79 },
      fetchedAt: '2026-01-01',
      stale: false,
    })

    const { result } = renderHook(() => useFormattedPrice(100), { wrapper })

    await waitFor(() => expect(mockFetchExchangeRates).toHaveBeenCalled())
    await waitFor(() => expect(result.current.currency).toBe('USD'))
    expect(result.current.isApproximate).toBe(false)
    expect(result.current.formatted).toContain('$100')
  })

  it('flags non-USD prices as approximate even when rates are fresh', async () => {
    setCurrency('CAD')
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.35, GBP: 0.79 },
      fetchedAt: '2026-01-01',
      stale: false,
    })

    const { result } = renderHook(() => useFormattedPrice(100), { wrapper })

    await waitFor(() => expect(result.current.currency).toBe('CAD'))
    expect(result.current.isApproximate).toBe(true)
  })

  it('marks USD prices as approximate when the server reports stale rates', async () => {
    setCurrency('USD')
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      rates: { USD: 1, CAD: 1.3, GBP: 0.8 },
      fetchedAt: '2026-01-01',
      stale: true,
    })

    const { result } = renderHook(() => useFormattedPrice(100), { wrapper })

    // currency is always 'USD' in this test — wait for the stale flag to propagate.
    await waitFor(() => expect(result.current.isApproximate).toBe(true))
  })

  it('falls back to rate=1 when displayCurrency is missing from the rates map', async () => {
    setCurrency('GBP')
    mockFetchExchangeRates.mockResolvedValue({
      base: 'USD',
      // GBP intentionally omitted to simulate a partial response.
      rates: { USD: 1, CAD: 1.35 } as never,
      fetchedAt: '2026-01-01',
      stale: false,
    })

    const { result } = renderHook(() => useFormattedPrice(50), { wrapper })

    await waitFor(() => expect(result.current.currency).toBe('GBP'))
    // 50 USD × 1 (fallback) = 50; renders as £50.00 (locale en-US for GBP)
    expect(result.current.formatted).toMatch(/£50/)
  })
})

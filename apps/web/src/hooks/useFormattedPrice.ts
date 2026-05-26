'use client'

import { useQuery } from '@tanstack/react-query'
import { formatCurrencyPrice, type DisplayCurrency } from '@jewelry/shared'
import { useCurrencyStore } from '@/store/currency.store'
import { fetchExchangeRates, type ExchangeRatesResponse } from '@/lib/api/exchange-rates'

const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * Single shared query for exchange rates. TanStack Query dedupes across all
 * components so only one network request fires per session, regardless of how
 * many price tags are on the page.
 */
export function useExchangeRates() {
  return useQuery<ExchangeRatesResponse>({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    // Server already caches for 1h — mirror that on the client so we don't
    // re-fetch on every navigation either.
    staleTime: ONE_HOUR_MS,
    // Cache survives navigation between pages within the same session.
    gcTime: 2 * ONE_HOUR_MS,
  })
}

interface FormattedPrice {
  /** Localized price string, e.g. "CA$92.48". USD when rates aren't loaded yet. */
  formatted: string
  /** What currency `formatted` is in. */
  currency: DisplayCurrency
  /** `true` when the API served fallback rates — the UI can show "approximate". */
  isApproximate: boolean
}

/**
 * Resolves a USD amount to the visitor's preferred display currency. Falls
 * back to USD formatting when rates haven't loaded yet — no flash of empty
 * price tags during the first paint.
 */
export function useFormattedPrice(amountInUsd: number): FormattedPrice {
  const displayCurrency = useCurrencyStore((state) => state.displayCurrency)
  const { data } = useExchangeRates()

  // No data yet (first paint / API down) — render USD as a safe placeholder.
  if (!data) {
    return {
      formatted: formatCurrencyPrice(amountInUsd, 'USD', 1),
      currency: 'USD',
      isApproximate: false,
    }
  }

  const rate = data.rates[displayCurrency] ?? 1
  return {
    formatted: formatCurrencyPrice(amountInUsd, displayCurrency, rate),
    currency: displayCurrency,
    // Anything that isn't USD is technically approximate (rate drifts hourly,
    // checkout still charges USD), AND we explicitly mark API-down state.
    isApproximate: displayCurrency !== 'USD' || data.stale,
  }
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { formatCurrencyPrice, type DisplayCurrency } from '@jewelry/shared'
import { useCurrencyStore } from '@/store/currency.store'
import { fetchExchangeRates, type ExchangeRatesResponse } from '@/lib/api/exchange-rates'

const ONE_HOUR_MS = 60 * 60 * 1000

// Single shared query — TanStack dedupes so only one request fires per session
// regardless of how many price tags are on the page.
export function useExchangeRates() {
  return useQuery<ExchangeRatesResponse>({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    // Server already caches for 1h — mirror it client-side.
    staleTime: ONE_HOUR_MS,
    gcTime: 2 * ONE_HOUR_MS,
  })
}

interface FormattedPrice {
  formatted: string
  currency: DisplayCurrency
  isApproximate: boolean
}

export function useFormattedPrice(amountInUsd: number): FormattedPrice {
  const displayCurrency = useCurrencyStore((state) => state.displayCurrency)
  const { data } = useExchangeRates()

  // First paint / API down — render USD as a safe placeholder, no flash.
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
    // Non-USD is always approximate (rate drift; checkout charges USD). Also
    // mark explicit API-down state.
    isApproximate: displayCurrency !== 'USD' || data.stale,
  }
}

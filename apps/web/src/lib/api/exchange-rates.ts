import type { DisplayCurrency } from '@jewelry/shared'
import { apiClient } from './client'

export interface ExchangeRatesResponse {
  base: DisplayCurrency
  rates: Record<DisplayCurrency, number>
  fetchedAt: string
  /** `true` when the server is serving fallback rates (API key missing / upstream down). */
  stale: boolean
}

export async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  return apiClient<ExchangeRatesResponse>('/api/exchange-rates')
}

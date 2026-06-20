import { Injectable, Logger } from '@nestjs/common'

// DB stores USD; we convert at display time per docs/09_MULTI_CURRENCY.md.
// Phase 1 is CAD + GBP only — EUR waits on TaxJar (EU VAT).
export const SUPPORTED_DISPLAY_CURRENCIES = ['USD', 'CAD', 'GBP'] as const
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number]

const BASE_CURRENCY: DisplayCurrency = 'USD'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 h — ExchangeRate-API free-tier ceiling.

// Graceful-degradation safety net, not a source of truth — the frontend
// "Prices shown in CAD/GBP are approximate" disclaimer covers the variance.
const FALLBACK_RATES: Readonly<Record<DisplayCurrency, number>> = {
  USD: 1,
  CAD: 1.36,
  GBP: 0.79,
}

export interface ExchangeRatesResponse {
  base: DisplayCurrency
  rates: Record<DisplayCurrency, number>
  fetchedAt: string
  stale: boolean
}

interface ExchangeRateApiResponse {
  result?: string
  conversion_rates?: Record<string, number>
  'error-type'?: string
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name)
  private cachedRates: Record<DisplayCurrency, number> = { ...FALLBACK_RATES }
  private cachedAt = 0
  private isStale = true

  // Failures keep the stale cache rather than 500-ing the storefront.
  async getExchangeRates(): Promise<ExchangeRatesResponse> {
    const isExpired = Date.now() - this.cachedAt > CACHE_TTL_MS
    if (isExpired) {
      await this.refreshExchangeRates()
    }
    return {
      base: BASE_CURRENCY,
      rates: { ...this.cachedRates },
      fetchedAt: new Date(this.cachedAt || Date.now()).toISOString(),
      stale: this.isStale,
    }
  }

  private async refreshExchangeRates(): Promise<void> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    if (!apiKey) {
      this.logger.warn('EXCHANGE_RATE_API_KEY missing — serving fallback rates')
      this.cachedAt = Date.now()
      this.isStale = true
      return
    }

    try {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${BASE_CURRENCY}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as ExchangeRateApiResponse
      if (data.result !== 'success' || !data.conversion_rates) {
        throw new Error(`API error: ${data['error-type'] ?? 'unknown'}`)
      }

      const nextRates: Record<DisplayCurrency, number> = { ...FALLBACK_RATES }
      for (const currency of SUPPORTED_DISPLAY_CURRENCIES) {
        const rate = data.conversion_rates[currency]
        if (typeof rate === 'number' && rate > 0) {
          nextRates[currency] = rate
        }
      }

      this.cachedRates = nextRates
      this.cachedAt = Date.now()
      this.isStale = false
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      this.logger.warn(`Exchange rate refresh failed (${message}) — keeping cached rates`)
      // Stamp attempt time so we don't hammer the API while it's down.
      this.cachedAt = Date.now()
      this.isStale = true
    }
  }
}

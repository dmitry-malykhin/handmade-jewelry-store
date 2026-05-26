import { Injectable, Logger } from '@nestjs/common'

/**
 * Currencies the storefront supports in display-mode. The base is always USD —
 * prices in the DB stay in USD and we convert at display time per
 * docs/09_MULTI_CURRENCY.md. Phase 1 keeps CAD + GBP only (no EU VAT
 * complications); EUR lands when TaxJar is wired in.
 */
export const SUPPORTED_DISPLAY_CURRENCIES = ['USD', 'CAD', 'GBP'] as const
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number]

const BASE_CURRENCY: DisplayCurrency = 'USD'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour — ExchangeRate-API free tier ceiling

/**
 * Fallback rates so the storefront stays usable when the API is down or
 * `EXCHANGE_RATE_API_KEY` is missing (e.g. local dev without secrets). These
 * are deliberately rough — they're a graceful-degradation safety net, not a
 * source of truth. The disclaimer "Prices shown in CAD/GBP are approximate"
 * on the frontend covers the variance.
 */
const FALLBACK_RATES: Readonly<Record<DisplayCurrency, number>> = {
  USD: 1,
  CAD: 1.36,
  GBP: 0.79,
}

export interface ExchangeRatesResponse {
  base: DisplayCurrency
  rates: Record<DisplayCurrency, number>
  /** ISO timestamp of the last successful fetch (or fallback bootstrap). */
  fetchedAt: string
  /** `true` when serving FALLBACK_RATES (API key missing or last fetch failed). */
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

  /**
   * Returns cached rates. Refreshes when older than `CACHE_TTL_MS`, but never
   * blocks the request — if the API call fails we keep serving the stale (or
   * fallback) values rather than 500'ing the storefront.
   */
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

  /**
   * Fetches a fresh rates table from ExchangeRate-API. On any failure
   * (missing key, non-200, malformed body) we silently keep the previous
   * cache and mark it stale — better degraded display than no display.
   */
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
      // Stamp the attempt time so we don't hammer the API on every request
      // when it's down, but keep `isStale: true` so the client can flag it.
      this.cachedAt = Date.now()
      this.isStale = true
    }
  }
}

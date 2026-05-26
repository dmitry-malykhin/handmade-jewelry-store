/**
 * Currencies the storefront supports in display-mode (matches
 * `SUPPORTED_DISPLAY_CURRENCIES` on the API). Base storage is always USD.
 */
export const SUPPORTED_DISPLAY_CURRENCIES = ['USD', 'CAD', 'GBP'] as const
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number]

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(value)
}

/**
 * Renders a USD amount as a localized currency string using `Intl.NumberFormat`.
 * The math is intentionally single-line: `amountInUsd * rate` — rounding to
 * two decimals is delegated to `Intl.NumberFormat` so locale-specific quirks
 * (e.g. `1,42 €` in fr-FR vs `€1.42` in en-US) come for free.
 *
 * When `targetCurrency === 'USD'`, the rate argument is ignored — USD is the
 * base and a rate that's not exactly 1 would silently distort prices.
 */
export function formatCurrencyPrice(
  amountInUsd: number,
  targetCurrency: DisplayCurrency,
  exchangeRate: number,
): string {
  const effectiveRate = targetCurrency === 'USD' ? 1 : exchangeRate
  const converted = amountInUsd * effectiveRate
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted)
}

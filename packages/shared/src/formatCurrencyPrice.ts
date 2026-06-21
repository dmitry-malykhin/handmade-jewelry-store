export const SUPPORTED_DISPLAY_CURRENCIES = ['USD', 'CAD', 'GBP'] as const
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number]

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(value)
}

export function formatCurrencyPrice(
  amountInUsd: number,
  targetCurrency: DisplayCurrency,
  exchangeRate: number,
): string {
  // USD is the base — ignore rate to avoid silent distortion when caller passes ≠1.
  const effectiveRate = targetCurrency === 'USD' ? 1 : exchangeRate
  const converted = amountInUsd * effectiveRate
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted)
}

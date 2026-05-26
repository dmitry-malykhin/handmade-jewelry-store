import { describe, it, expect } from 'vitest'
import { formatCurrencyPrice, isDisplayCurrency } from '@jewelry/shared'

describe('formatCurrencyPrice', () => {
  it('renders USD as "$X.XX" with two decimals', () => {
    expect(formatCurrencyPrice(68, 'USD', 1)).toBe('$68.00')
    expect(formatCurrencyPrice(0, 'USD', 1)).toBe('$0.00')
  })

  it('ignores the rate argument when targetCurrency is USD', () => {
    // Defensive: even if the caller passes a stale or accidental rate, USD
    // amounts must never be silently mutated.
    expect(formatCurrencyPrice(68, 'USD', 1.42)).toBe('$68.00')
  })

  it('renders CAD with the CA$ symbol and converts via the rate', () => {
    expect(formatCurrencyPrice(68, 'CAD', 1.36)).toBe('CA$92.48')
  })

  it('renders GBP with the £ symbol and converts via the rate', () => {
    expect(formatCurrencyPrice(100, 'GBP', 0.79)).toBe('£79.00')
  })

  it('rounds to two decimals via Intl.NumberFormat (banker rounding aware)', () => {
    // 68 * 1.357 = 92.276 → £92.28 when banker-rounded
    expect(formatCurrencyPrice(68, 'GBP', 1.357)).toBe('£92.28')
  })

  it('handles fractional USD amounts (kept as-is)', () => {
    expect(formatCurrencyPrice(49.99, 'USD', 1)).toBe('$49.99')
  })
})

describe('isDisplayCurrency', () => {
  it('returns true for supported currencies', () => {
    expect(isDisplayCurrency('USD')).toBe(true)
    expect(isDisplayCurrency('CAD')).toBe(true)
    expect(isDisplayCurrency('GBP')).toBe(true)
  })

  it('returns false for EUR (Phase 2)', () => {
    expect(isDisplayCurrency('EUR')).toBe(false)
  })

  it('returns false for nonsense input — protects against tampered localStorage', () => {
    expect(isDisplayCurrency('not-a-currency')).toBe(false)
    expect(isDisplayCurrency('')).toBe(false)
  })
})

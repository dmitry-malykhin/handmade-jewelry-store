import { describe, it, expect } from 'vitest'
import { calculateInstallmentPreview } from '../installment-preview'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/__tests__')
  await $allureSubSuite('installment-preview')
  await $allureSeverity('normal')
})

describe('calculateInstallmentPreview()', () => {
  it('returns null when below Afterpay minimum ($35)', () => {
    expect(calculateInstallmentPreview(34.99)).toBeNull()
    expect(calculateInstallmentPreview(20)).toBeNull()
    expect(calculateInstallmentPreview(0)).toBeNull()
  })

  it('returns null when above Afterpay maximum ($1000)', () => {
    expect(calculateInstallmentPreview(1000.01)).toBeNull()
    expect(calculateInstallmentPreview(5000)).toBeNull()
  })

  it('returns null for invalid input (NaN, Infinity)', () => {
    expect(calculateInstallmentPreview(NaN)).toBeNull()
    expect(calculateInstallmentPreview(Infinity)).toBeNull()
  })

  it('splits price into 4 equal installments at exact boundary $35', () => {
    expect(calculateInstallmentPreview(35)).toEqual({
      installmentAmount: '8.75',
      installmentCount: 4,
    })
  })

  it('splits a typical jewelry price ($150) into 4 × $37.50', () => {
    expect(calculateInstallmentPreview(150)).toEqual({
      installmentAmount: '37.50',
      installmentCount: 4,
    })
  })

  it('handles non-round totals with proper rounding', () => {
    // 49.99 / 4 = 12.4975 → "12.50" (toFixed(2) rounds half-up)
    expect(calculateInstallmentPreview(49.99)).toEqual({
      installmentAmount: '12.50',
      installmentCount: 4,
    })
  })

  it('accepts the upper boundary $1000 ($250 × 4)', () => {
    expect(calculateInstallmentPreview(1000)).toEqual({
      installmentAmount: '250.00',
      installmentCount: 4,
    })
  })
})

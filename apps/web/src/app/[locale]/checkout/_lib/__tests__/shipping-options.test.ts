import { describe, it, expect } from 'vitest'
import {
  SHIPPING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  calculateShippingCost,
} from '../shipping-options'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('shipping-options')
  await $allureSeverity('normal')
})

describe('SHIPPING_OPTIONS', () => {
  it('contains standard and express options', () => {
    const optionIds = SHIPPING_OPTIONS.map((option) => option.id)
    expect(optionIds).toContain('standard')
    expect(optionIds).toContain('express')
  })

  it('has a free threshold only for standard shipping', () => {
    const standardOption = SHIPPING_OPTIONS.find((option) => option.id === 'standard')
    const expressOption = SHIPPING_OPTIONS.find((option) => option.id === 'express')

    expect(standardOption?.freeThreshold).toBe(FREE_SHIPPING_THRESHOLD)
    expect(expressOption?.freeThreshold).toBeNull()
  })
})

describe('calculateShippingCost', () => {
  // Both options are always defined — tested above
  const standardOption = SHIPPING_OPTIONS.find((option) => option.id === 'standard')!
  const expressOption = SHIPPING_OPTIONS.find((option) => option.id === 'express')!

  it('returns base cost for standard shipping when subtotal is below threshold', () => {
    const shippingCost = calculateShippingCost(standardOption, 30)
    expect(shippingCost).toBe(standardOption.baseCost)
  })

  it('returns 0 for standard shipping when subtotal meets the free threshold', () => {
    const shippingCost = calculateShippingCost(standardOption, FREE_SHIPPING_THRESHOLD)
    expect(shippingCost).toBe(0)
  })

  it('returns 0 for standard shipping when subtotal exceeds the free threshold', () => {
    const shippingCost = calculateShippingCost(standardOption, FREE_SHIPPING_THRESHOLD + 20)
    expect(shippingCost).toBe(0)
  })

  it('always returns base cost for express shipping regardless of subtotal', () => {
    const costBelowThreshold = calculateShippingCost(expressOption, 10)
    const costAboveThreshold = calculateShippingCost(expressOption, 200)

    expect(costBelowThreshold).toBe(expressOption.baseCost)
    expect(costAboveThreshold).toBe(expressOption.baseCost)
  })
})

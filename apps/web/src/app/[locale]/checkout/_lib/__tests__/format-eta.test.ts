import { describe, it, expect } from 'vitest'
import type { CartItem } from '@jewelry/shared'
import { findLongestProductionDays, calculateOrderEta } from '../format-eta'
import type { ShippingOption } from '../shipping-options'

const baseCartItem = {
  productId: 'p',
  slug: 's',
  title: 't',
  price: 10,
  image: '',
  quantity: 1,
} satisfies Omit<CartItem, 'productionDays'>

const standardShipping: ShippingOption = {
  id: 'standard',
  businessDaysMin: 5,
  businessDaysMax: 7,
  baseCost: 5.99,
  freeThreshold: 50,
}

describe('findLongestProductionDays()', () => {
  it('returns 0 for an empty cart', () => {
    expect(findLongestProductionDays([])).toBe(0)
  })

  it('returns 0 when every item is in stock (productionDays = 0)', () => {
    const cartItems: CartItem[] = [
      { ...baseCartItem, productId: 'a', productionDays: 0 },
      { ...baseCartItem, productId: 'b', productionDays: 0 },
    ]
    expect(findLongestProductionDays(cartItems)).toBe(0)
  })

  it('returns the largest productionDays across a mixed cart', () => {
    const cartItems: CartItem[] = [
      { ...baseCartItem, productId: 'a', productionDays: 0 },
      { ...baseCartItem, productId: 'b', productionDays: 5 },
      { ...baseCartItem, productId: 'c', productionDays: 7 },
    ]
    expect(findLongestProductionDays(cartItems)).toBe(7)
  })

  it('treats undefined productionDays as 0 (legacy carts persisted before #227)', () => {
    const cartItemWithoutProductionDays = { ...baseCartItem, productId: 'a' } as CartItem
    expect(findLongestProductionDays([cartItemWithoutProductionDays])).toBe(0)
  })
})

describe('calculateOrderEta()', () => {
  // Anchor date is a Monday so weekend rollover is predictable.
  const monday = new Date('2026-05-04T12:00:00Z')

  it('returns the shipping window unchanged when productionDays is 0', () => {
    const ungatedDelivery = calculateOrderEta(0, standardShipping, monday)
    // 5 business days from Mon May 4 = Mon May 11; 7 business days = Wed May 13
    expect(ungatedDelivery.earliest.toISOString().slice(0, 10)).toBe('2026-05-11')
    expect(ungatedDelivery.latest.toISOString().slice(0, 10)).toBe('2026-05-13')
  })

  it('extends the delivery window by productionDays when made on order', () => {
    // 3 (production) + 5–7 (shipping) = 8–10 business days
    const delayedDelivery = calculateOrderEta(3, standardShipping, monday)
    // 8 business days from Mon May 4 = Thu May 14; 10 = Mon May 18
    expect(delayedDelivery.earliest.toISOString().slice(0, 10)).toBe('2026-05-14')
    expect(delayedDelivery.latest.toISOString().slice(0, 10)).toBe('2026-05-18')
  })

  it('skips weekends in the combined production+shipping math', () => {
    // 0 production + 5 days = Mon → Mon (skip Sat/Sun)
    const result = calculateOrderEta(0, standardShipping, monday)
    expect(result.earliest.getDay()).not.toBe(0) // not Sunday
    expect(result.earliest.getDay()).not.toBe(6) // not Saturday
  })
})

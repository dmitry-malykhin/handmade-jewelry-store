import { describe, it, expect } from 'vitest'
import type { CartItem } from '@jewelry/shared'
import { buildOrderPayload } from '../build-order-payload'

const CHECKOUT_SHIPPING_COST = 9.99
import type { CheckoutAddressFormValues } from '../../_components/checkout-address-schema'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockCartItems: CartItem[] = [
  {
    productId: 'prod-1',
    slug: 'silver-ring',
    title: 'Silver Ring',
    price: 49.99,
    image: '/images/ring.jpg',
    quantity: 2,
  },
  {
    productId: 'prod-2',
    slug: 'gold-necklace',
    title: 'Gold Necklace',
    price: 129.99,
    image: '/images/necklace.jpg',
    quantity: 1,
  },
]

const mockFormValues: CheckoutAddressFormValues = {
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('build-order-payload')
  await $allureSeverity('normal')
})

describe('buildOrderPayload()', () => {
  it('maps cart items to order items with productSnapshot', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues)

    expect(payload.items).toHaveLength(2)
    expect(payload.items[0]).toEqual({
      productId: 'prod-1',
      quantity: 2,
      price: 49.99,
      productSnapshot: { title: 'Silver Ring', slug: 'silver-ring', image: '/images/ring.jpg' },
    })
  })

  it('excludes email from shippingAddress', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues)

    expect(payload.shippingAddress).not.toHaveProperty('email')
    expect(payload.shippingAddress.fullName).toBe('Jane Doe')
  })

  it('sets guestEmail from the form email field', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues)

    expect(payload.guestEmail).toBe('jane@example.com')
  })

  it('calculates subtotal as sum of price × quantity across all items', () => {
    // 49.99 × 2 = 99.98, 129.99 × 1 = 129.99 → subtotal = 229.97
    const payload = buildOrderPayload(mockCartItems, mockFormValues, CHECKOUT_SHIPPING_COST)

    expect(payload.subtotal).toBeCloseTo(229.97, 2)
  })

  it('stores the provided shippingCost in the payload', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues, 15.0)

    expect(payload.shippingCost).toBe(15.0)
  })

  it('calculates total as subtotal + shippingCost', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues, 10.0)

    expect(payload.total).toBeCloseTo(payload.subtotal + 10.0, 2)
  })

  it('calculates total correctly when shipping is free (0)', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues, 0)

    expect(payload.shippingCost).toBe(0)
    expect(payload.total).toBeCloseTo(payload.subtotal, 2)
  })

  it('sets source to "web"', () => {
    const payload = buildOrderPayload(mockCartItems, mockFormValues, CHECKOUT_SHIPPING_COST)

    expect(payload.source).toBe('web')
  })

  it('returns an empty items array when cart is empty', () => {
    const payload = buildOrderPayload([], mockFormValues, CHECKOUT_SHIPPING_COST)

    expect(payload.items).toHaveLength(0)
    expect(payload.subtotal).toBe(0)
    expect(payload.total).toBeCloseTo(CHECKOUT_SHIPPING_COST, 2)
  })

  it('includes optional shippingAddress fields when provided', () => {
    const formValuesWithOptionals: CheckoutAddressFormValues = {
      ...mockFormValues,
      addressLine2: 'Apt 4B',
      state: 'NY',
      phone: '+1-555-000-1234',
    }

    const payload = buildOrderPayload(
      mockCartItems,
      formValuesWithOptionals,
      CHECKOUT_SHIPPING_COST,
    )

    expect(payload.shippingAddress.addressLine2).toBe('Apt 4B')
    expect(payload.shippingAddress.state).toBe('NY')
    expect(payload.shippingAddress.phone).toBe('+1-555-000-1234')
  })
})

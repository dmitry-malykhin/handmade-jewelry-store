import { describe, it, expect } from 'vitest'
import { checkoutAddressSchema } from '../checkout-address-schema'

const validAddress = {
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
}

describe('checkoutAddressSchema', () => {
  it('accepts a valid address with required fields only', () => {
    const result = checkoutAddressSchema.safeParse(validAddress)
    expect(result.success).toBe(true)
  })

  it('accepts a valid address with all optional fields filled', () => {
    const result = checkoutAddressSchema.safeParse({
      ...validAddress,
      addressLine2: 'Apt 4B',
      state: 'NY',
      phone: '+1-555-000-1234',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email format', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty email', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects fullName shorter than 2 characters', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, fullName: 'J' })
    expect(result.success).toBe(false)
  })

  it('rejects addressLine1 shorter than 3 characters', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, addressLine1: '1A' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty city', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, city: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty postalCode', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, postalCode: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a country code longer than 2 characters', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, country: 'USA' })
    expect(result.success).toBe(false)
  })

  it('rejects a country code shorter than 2 characters', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, country: 'U' })
    expect(result.success).toBe(false)
  })
})

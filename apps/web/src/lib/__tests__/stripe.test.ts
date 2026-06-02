import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock loadStripe so the SDK isn't actually fetched during tests.
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn((key: string) => Promise.resolve({ __mockStripe: key })),
}))

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

async function importStripeHelperFresh() {
  vi.resetModules()
  return import('../stripe')
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ORIGINAL_PUBLISHABLE_KEY
})

describe('getStripePromise', () => {
  it('returns a Stripe promise when the publishable key is configured', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_abc123'
    process.env.NODE_ENV = 'production'

    const { getStripePromise } = await importStripeHelperFresh()

    const stripe = await getStripePromise()
    expect(stripe).toEqual({ __mockStripe: 'pk_test_abc123' })
  })

  it('throws synchronously in production when the key is missing', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ''
    process.env.NODE_ENV = 'production'

    // The module-level `stripePromise = getStripePromise()` evaluates during
    // import in production — the import itself rejects.
    await expect(importStripeHelperFresh()).rejects.toThrow(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/)
  })

  it('returns null + warns in development when the key is missing', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ''
    process.env.NODE_ENV = 'development'
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { getStripePromise } = await importStripeHelperFresh()

    expect(getStripePromise()).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    )
  })

  it('treats whitespace-only keys as missing', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = '   '
    process.env.NODE_ENV = 'production'

    await expect(importStripeHelperFresh()).rejects.toThrow(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/)
  })
})

describe('isStripeConfigured', () => {
  it('returns true when the module-level promise is non-null (key set)', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_abc'
    process.env.NODE_ENV = 'production'

    const { isStripeConfigured } = await importStripeHelperFresh()

    expect(isStripeConfigured()).toBe(true)
  })

  it('returns false in development when the key is missing', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ''
    process.env.NODE_ENV = 'development'
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { isStripeConfigured } = await importStripeHelperFresh()

    expect(isStripeConfigured()).toBe(false)
  })
})

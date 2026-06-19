import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Fail-loud in production, warn-once in dev. The check runs at module load so
// missing config surfaces on first import, not after the user fills the form.

let warnedAboutMissingKey = false

export function getStripePromise(): Promise<Stripe | null> | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!publishableKey || publishableKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe Elements cannot initialise. ' +
          'Configure the env var on your hosting platform (Vercel / Fly.io secrets) and redeploy.',
      )
    }

    if (!warnedAboutMissingKey) {
      console.warn(
        '[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is empty — Stripe Elements will not load. ' +
          'Set it in apps/web/.env.local to test the checkout flow.',
      )
      warnedAboutMissingKey = true
    }
    return null
  }

  return loadStripe(publishableKey)
}

// Stripe.js docs: call loadStripe exactly once per page session.
export const stripePromise = getStripePromise()

export function isStripeConfigured(): boolean {
  return stripePromise !== null
}

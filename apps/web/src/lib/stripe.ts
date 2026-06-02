import { loadStripe, type Stripe } from '@stripe/stripe-js'

/**
 * Builds the Stripe.js promise for `<Elements stripe={...}>`. Centralises
 * publishable-key validation in one place so every checkout entry point
 * gets the same fail-loud behaviour.
 *
 * Behaviour:
 *  - Production + key missing → throws synchronously. The checkout page
 *    catches this and renders a "Payments unavailable — admin notified"
 *    banner instead of letting Stripe.js init silently with `pk_` = `""`.
 *  - Development + key missing → returns `null` and warns once. Lets local
 *    devs work on non-payment screens without standing up a Stripe account.
 *
 * The check runs at module-load time (when this file is first imported)
 * which guarantees the error surfaces immediately on the first page that
 * uses Stripe, not after the user has filled out the address form.
 */

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

    // Dev / test — warn once so the build isn't blocked but the dev sees the missing config.
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

/**
 * Module-level singleton — Stripe.js docs recommend calling `loadStripe`
 * exactly once per page session so the SDK isn't re-downloaded.
 */
export const stripePromise = getStripePromise()

export function isStripeConfigured(): boolean {
  return stripePromise !== null
}

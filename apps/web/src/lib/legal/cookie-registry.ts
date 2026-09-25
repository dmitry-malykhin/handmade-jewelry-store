// Per-cookie disclosure registry required by EDPB Guidelines 03/2022 and the
// CNIL cookie doctrine. Every third-party script or first-party technology
// that sets a cookie or a comparable client-side identifier MUST appear here
// so users can see exactly what is stored on their device before consenting.
//
// When adding a new tracker/script anywhere in the app, add a matching entry
// here in the same PR; the /cookies page and the banner's per-category tables
// read from this registry.

export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

export interface CookieEntry {
  /** Cookie or storage-key name as written to the browser. */
  name: string
  /** Company controlling the cookie (data controller/processor). */
  provider: string
  /**
   * i18n key under `cookiePolicy.purposes` for a short, plain-English purpose
   * description. Keeping the copy in messages files lets translators handle it.
   */
  purposeKey: string
  /** Human-readable retention. Use the same phrase across all three locales. */
  duration: string
  category: CookieCategory
  /**
   * Country/region where the cookie contents are typically processed. Fills
   * the "Data transfer" column and drives the Schrems II/DPF disclosure.
   */
  dataTransferCountry: string
}

export const COOKIE_REGISTRY: readonly CookieEntry[] = [
  // ── Necessary ────────────────────────────────────────────────────────────
  {
    name: 'refresh-token',
    provider: 'Senichka (this site)',
    purposeKey: 'refreshToken',
    duration: '30 days',
    category: 'necessary',
    dataTransferCountry: 'EU (Fly.io)',
  },
  {
    name: 'cookie-consent',
    provider: 'Senichka (this site)',
    purposeKey: 'consentStorage',
    duration: 'Persistent (localStorage)',
    category: 'necessary',
    dataTransferCountry: 'Browser only',
  },
  {
    name: 'cart',
    provider: 'Senichka (this site)',
    purposeKey: 'cartStorage',
    duration: 'Persistent (localStorage)',
    category: 'necessary',
    dataTransferCountry: 'Browser only',
  },
  {
    name: '__stripe_mid, __stripe_sid, m',
    provider: 'Stripe, Inc.',
    purposeKey: 'stripeFraud',
    duration: '1 year / 30 minutes',
    category: 'necessary',
    dataTransferCountry: 'USA (SCCs + EU-US DPF)',
  },
  // ── Analytics ────────────────────────────────────────────────────────────
  {
    name: '_ga, _ga_*',
    provider: 'Google LLC (GA4)',
    purposeKey: 'ga4',
    duration: '13 months',
    category: 'analytics',
    dataTransferCountry: 'USA (SCCs + EU-US DPF)',
  },
  {
    name: 'ph_*_posthog',
    provider: 'PostHog Inc.',
    purposeKey: 'posthog',
    duration: '12 months',
    category: 'analytics',
    dataTransferCountry: 'USA (SCCs)',
  },
  {
    name: '_clck, _clsk, CLID',
    provider: 'Microsoft Corporation (Clarity)',
    purposeKey: 'clarity',
    duration: '1 year / 1 day',
    category: 'analytics',
    dataTransferCountry: 'USA (SCCs + EU-US DPF)',
  },
  // ── Marketing ────────────────────────────────────────────────────────────
  {
    name: '_fbp, _fbc',
    provider: 'Meta Platforms Inc.',
    purposeKey: 'fbPixel',
    duration: '90 days',
    category: 'marketing',
    dataTransferCountry: 'USA (SCCs + EU-US DPF)',
  },
  {
    name: '_pin_unauth, _epik',
    provider: 'Pinterest, Inc.',
    purposeKey: 'pinterestTag',
    duration: '1 year',
    category: 'marketing',
    dataTransferCountry: 'USA (SCCs)',
  },
  {
    name: '__kla_id',
    provider: 'Klaviyo Inc.',
    purposeKey: 'klaviyo',
    duration: '2 years',
    category: 'marketing',
    dataTransferCountry: 'USA (SCCs)',
  },
] as const

export function getCookiesByCategory(category: CookieCategory): CookieEntry[] {
  return COOKIE_REGISTRY.filter((cookie) => cookie.category === category)
}

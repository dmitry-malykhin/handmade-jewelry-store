// HTTP response headers applied to every route by next.config.ts.
// Split out for unit-testing: next.config.ts isn't importable from vitest
// (withSentryConfig has side effects at module load).

interface SecurityHeader {
  key: string
  value: string
}

// CSP host allowlist for `script-src`. Verified against current SDK usage
// (apps/web/src/components/analytics/*, lib/stripe.ts):
//   - js.stripe.com           — Stripe.js + Elements
//   - www.googletagmanager.com — GTM container loader (GA4 + ads)
//   - connect.facebook.net    — Facebook Pixel
//   - static.klaviyo.com      — Klaviyo onsite tracking + forms
//   - us.i.posthog.com,
//     us-assets.i.posthog.com — PostHog autocapture (ingest + asset bundle)
//   - www.clarity.ms          — Microsoft Clarity session replay
const SCRIPT_SRC_HOSTS = [
  'https://js.stripe.com',
  'https://www.googletagmanager.com',
  'https://connect.facebook.net',
  'https://static.klaviyo.com',
  'https://us.i.posthog.com',
  'https://us-assets.i.posthog.com',
  'https://www.clarity.ms',
]

// frame-src: payment Elements + 3D-Secure challenge iframes
const FRAME_SRC_HOSTS = ['https://js.stripe.com', 'https://hooks.stripe.com']

// connect-src allowlist: explicit hosts confine XSS exfiltration to trusted destinations.
// Grouped by SDK — drop the group when a vendor is retired.
const CONNECT_SRC_HOSTS = [
  // NestJS API origin injected at runtime from NEXT_PUBLIC_API_URL.
  // PostHog ingest + asset bundle
  'https://us.i.posthog.com',
  'https://us-assets.i.posthog.com',
  // GA4 + GTM (measurement + tag manager beacons)
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://analytics.google.com',
  'https://www.googletagmanager.com',
  'https://stats.g.doubleclick.net',
  // Meta Pixel beacons
  'https://www.facebook.com',
  'https://connect.facebook.net',
  // Pinterest tag
  'https://ct.pinterest.com',
  'https://s.pinimg.com',
  // Microsoft Clarity — session-replay shards on a.clarity.ms..z.clarity.ms
  'https://*.clarity.ms',
  // Klaviyo subscribe + event ingest
  'https://*.klaviyo.com',
  // Stripe payment tokenisation + telemetry
  'https://api.stripe.com',
  'https://m.stripe.com',
  'https://q.stripe.com',
  // Sentry error/perf ingest (project-specific subdomain baked into DSN)
  'https://*.ingest.sentry.io',
]

function extractOrigin(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// Build CSP with a per-request nonce. Without nonce (static build-time CSP)
// falls back to unsafe-inline — but that path is only used when middleware is
// bypassed. Runtime path is always nonce-based via middleware.
export function buildContentSecurityPolicy(nonce?: string): string {
  const apiOrigin = extractOrigin(process.env.NEXT_PUBLIC_API_URL)
  const connectSrcHosts = apiOrigin ? [apiOrigin, ...CONNECT_SRC_HOSTS] : CONNECT_SRC_HOSTS
  // strict-dynamic: a nonce'd script may load additional scripts (Next.js
  // hydration chunks). Explicit host allowlist stays for browsers ignoring it.
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${SCRIPT_SRC_HOSTS.join(' ')}`
    : `script-src 'self' 'unsafe-inline' ${SCRIPT_SRC_HOSTS.join(' ')}`
  return [
    "default-src 'self'",
    scriptSrc,
    `connect-src 'self' ${connectSrcHosts.join(' ')}`,
    // CDN images (R2 / S3) + base64 data URIs (next/image blur placeholders)
    "img-src 'self' data: https:",
    // 'unsafe-inline' for next-intl font preloads + CSS-in-JS components
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `frame-src ${FRAME_SRC_HOSTS.join(' ')}`,
    // Stripe Elements spawns a worker from a blob: URL for card tokenisation.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

// Headers that apply on every environment (no HTTPS / XSS dependency).
const baselineHeaders: SecurityHeader[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// Headers that must NOT emit in development.
//
// HSTS: a single dev visit would lock the browser to HTTPS on localhost for
//   2 years — breaks every subsequent `next dev` run.
// CSP : Next.js dev mode uses eval() for HMR and inline scripts that don't
//   match the production policy. A strict CSP in dev blocks Fast Refresh.
function productionOnlyHeaders(): SecurityHeader[] {
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    // Content-Security-Policy is set by middleware with a per-request nonce.
    // Cross-origin isolation. same-origin lets OAuth popups still postMessage
    // back; same-site lets our own CDN serve images without CORP rejections.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  ]
}

export function getSecurityHeaders(nodeEnv: string | undefined): SecurityHeader[] {
  if (nodeEnv === 'production') {
    return [...baselineHeaders, ...productionOnlyHeaders()]
  }
  return baselineHeaders
}

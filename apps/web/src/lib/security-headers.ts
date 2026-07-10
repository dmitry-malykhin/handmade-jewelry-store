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

function buildContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    // 'unsafe-inline': Next.js App Router emits inline <script> chunks for
    // streaming. A nonce-based policy would be cleaner but requires every
    // third-party SDK to support nonces — none of ours do.
    `script-src 'self' 'unsafe-inline' ${SCRIPT_SRC_HOSTS.join(' ')}`,
    // Wide-open connect-src so analytics ingest endpoints don't need a
    // host-by-host whitelist. Tightening here would silently break any new
    // tracking SDK; revisit after launch when the SDK list is stable.
    "connect-src 'self' http: https: wss:",
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
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
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

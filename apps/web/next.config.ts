import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone output: bundles a minimal self-contained server.
  // Required for Docker — eliminates the need to copy all node_modules into the image.
  // Produces .next/standalone/server.js that can run without next start.
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    // dangerouslyAllowSVG required because placehold.co returns SVG format
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'none'; style-src 'unsafe-inline'",
    remotePatterns: [
      {
        // Placeholder images used in seed data during development
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
}

// withSentryConfig wraps the Next.js config to:
// 1. Auto-instrument pages and API routes with Sentry tracing
// 2. Upload source maps to Sentry on build (so stack traces show real line numbers)
// 3. Delete source maps from the production bundle (users cannot see our source code)
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress Sentry CLI output during builds unless explicitly debugging
  silent: !process.env.CI,

  // Delete source maps from the production bundle after uploading to Sentry.
  // They are stored in Sentry so stack traces show real code, but users cannot download them.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable the Sentry overlay in development — we use Next.js error overlay instead
  disableLogger: true,

  // Do not wrap build in Sentry tunnel if DSN is not configured
  automaticVercelMonitors: false,
})

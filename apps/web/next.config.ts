import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'
import { getSecurityHeaders } from './src/lib/security-headers'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone output: bundles a minimal self-contained server.
  // Required for Docker — eliminates the need to copy all node_modules into the image.
  // Produces .next/standalone/server.js that can run without next start.
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: getSecurityHeaders(process.env.NODE_ENV) }]
  },
  async redirects() {
    // 301 redirects from the old /shop URL space to the new layout (#280).
    // Catalog moved from /shop to / (home is the catalog); product detail moved
    // from /shop/[slug] to /products/[slug]. Locale-prefixed because routing
    // segments live under [locale].
    return [
      {
        source: '/:locale(en|ru|es)/shop',
        destination: '/:locale',
        permanent: true,
      },
      {
        source: '/:locale(en|ru|es)/shop/:slug',
        destination: '/:locale/products/:slug',
        permanent: true,
      },
    ]
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

  // disableLogger / automaticVercelMonitors moved under `webpack` in v8+; both
  // top-level keys emit deprecation warnings on next build.
  webpack: {
    // Tree-shake Sentry debug logging in the production bundle.
    treeshake: {
      removeDebugLogging: true,
    },
    // We are not on Vercel; skip the Vercel cron monitor auto-wrap.
    automaticVercelMonitors: false,
  },
})

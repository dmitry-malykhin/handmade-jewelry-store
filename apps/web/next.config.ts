import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'
import { getSecurityHeaders } from './src/lib/security-headers'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone bundles a self-contained server — Docker image skips node_modules.
  output: 'standalone',
  // Force blocking metadata for every request — Next 15 default streams async
  // generateMetadata into <body>, so any UA outside its bot regex (LH CLI, most
  // crawlers) sees an empty <head> in the SSR HTML.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: '/(.*)', headers: getSecurityHeaders(process.env.NODE_ENV) }]
  },
  async redirects() {
    // Legacy /shop → new layout (#280). Locale-prefixed because [locale] is a routing segment.
    // /products (no slug) → home: catalog lives at locale root; the bare listing URL is a natural
    // guess but returns 404 without this. (#452)
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
      {
        source: '/:locale(en|ru|es)/products',
        destination: '/:locale',
        permanent: true,
      },
    ]
  },
  images: {
    // placehold.co returns SVG — required to allow it through next/image.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'none'; style-src 'unsafe-inline'",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
}

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // disableLogger / automaticVercelMonitors moved under `webpack` in v8+ —
  // top-level keys would emit deprecation warnings on build.
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
})

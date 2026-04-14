import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

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

export default withNextIntl(nextConfig)

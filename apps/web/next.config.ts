import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
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

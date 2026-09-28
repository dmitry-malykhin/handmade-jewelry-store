import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/config/site-url'
import { routing } from '@/i18n/routing'

const SITE_URL = getSiteUrl()

const PRIVATE_PATHS = ['cart', 'checkout', 'account'] as const

const localisedDisallows = routing.locales.flatMap((locale) =>
  PRIVATE_PATHS.map((path) => `/${locale}/${path}/`),
)

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', ...localisedDisallows, '/*?*sort=', '/*?*page='],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

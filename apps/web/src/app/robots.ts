import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block private/transactional pages from indexing
        disallow: ['/admin/', '/checkout/', '/cart/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

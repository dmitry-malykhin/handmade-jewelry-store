import type { MetadataRoute } from 'next'
import { fetchAllProducts, fetchCategories } from '@/lib/api/products'
import { routing } from '@/i18n/routing'
import { logger } from '@/lib/logger'
import { getSiteUrl } from '@/lib/config/site-url'

const SITE_URL = getSiteUrl()

// ISR — regenerate sitemap every hour alongside catalog revalidation
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string; updatedAt: string }[] = []
  let categories: { slug: string }[] = []

  try {
    // fetchAllProducts paginates through the API's 100-per-page cap so the
    // sitemap stays correct as the catalogue grows past 100 SKUs.
    const [allProducts, categoriesResponse] = await Promise.all([
      fetchAllProducts(),
      fetchCategories(),
    ])
    products = allProducts
    categories = categoriesResponse
  } catch (error) {
    // Sitemap is critical for SEO — a silent failure here makes the bug invisible
    // until Google stops crawling product pages. Log loudly so it shows up in Sentry / log aggregation.
    logger.error('sitemap.products-fetch.failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }

  const staticEntries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) => [
    {
      // Home is the catalog — daily change frequency, highest priority
      url: `${SITE_URL}/${locale}`,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      // High-SEO-value evergreen content; rarely changes.
      url: `${SITE_URL}/${locale}/ring-size-guide`,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    },
    // Trust pages — evergreen, conversion-critical for handmade jewelry
    {
      url: `${SITE_URL}/${locale}/faq`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/${locale}/shipping`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/${locale}/care`,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    ...categories.map((category) => ({
      url: `${SITE_URL}/${locale}?categorySlug=${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ])

  const productEntries: MetadataRoute.Sitemap = products.flatMap((product) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  )

  return [...staticEntries, ...productEntries]
}

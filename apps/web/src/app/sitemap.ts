import type { MetadataRoute } from 'next'
import { fetchAllProducts, fetchCategories } from '@/lib/api/products'
import { routing } from '@/i18n/routing'
import { logger } from '@/lib/logger'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
      // Home is the catalog (#280) — daily change frequency, highest priority
      url: `${SITE_URL}/${locale}`,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      // Issue #118 — high-SEO-value evergreen content; rarely changes.
      url: `${SITE_URL}/${locale}/ring-size-guide`,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
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

import type { MetadataRoute } from 'next'
import { fetchProducts, fetchCategories } from '@/lib/api/products'
import { routing } from '@/i18n/routing'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// ISR — regenerate sitemap every hour alongside catalog revalidation
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string; updatedAt: string }[] = []
  let categories: { slug: string }[] = []

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      // Fetch all products — one sitemap supports up to 50k URLs, limit: 1000 is well within range
      fetchProducts({ limit: 1000 }),
      fetchCategories(),
    ])
    products = productsResponse.data
    categories = categoriesResponse
  } catch {
    // API unavailable at build time — static pages only; sitemap regenerates on next revalidation
  }

  const staticEntries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) => [
    {
      url: `${SITE_URL}/${locale}`,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/${locale}/shop`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...categories.map((category) => ({
      url: `${SITE_URL}/${locale}/shop?categorySlug=${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ])

  const productEntries: MetadataRoute.Sitemap = products.flatMap((product) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}/shop/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  )

  return [...staticEntries, ...productEntries]
}

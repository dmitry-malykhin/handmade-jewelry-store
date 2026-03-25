import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchProducts, fetchCategories } from '@/lib/api/products'
import { generateBreadcrumbJsonLd } from '@/lib/seo/json-ld'
import { ProductGrid } from '@/components/features/catalog/product-grid'
import { ProductGridSkeleton } from '@/components/features/catalog/product-grid-skeleton'
import { CatalogHeader } from './_components/catalog-header'
import { CatalogFilters } from './_components/catalog-filters'
import { CatalogPagination } from './_components/catalog-pagination'

// ISR — revalidate catalog every hour so new products appear without full redeploy
export const revalidate = 3600

const PRODUCTS_PER_PAGE = 20

type CatalogSearchParams = {
  page?: string
  categorySlug?: string
  minPrice?: string
  maxPrice?: string
  sortBy?: string
  sortOrder?: string
}

interface CatalogPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'catalog' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
    alternates: {
      // canonical always points to base /shop — filter combinations must not create duplicate content
      canonical: `/${locale}/shop`,
      languages: { en: '/en/shop', ru: '/ru/shop', es: '/es/shop' },
    },
  }
}

export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
  const { locale } = await params
  const resolvedSearchParams = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('catalog')

  const currentPage = Math.max(1, Number(resolvedSearchParams.page ?? 1))
  const categorySlug = resolvedSearchParams.categorySlug
  const minPrice = resolvedSearchParams.minPrice ? Number(resolvedSearchParams.minPrice) : undefined
  const maxPrice = resolvedSearchParams.maxPrice ? Number(resolvedSearchParams.maxPrice) : undefined
  const sortBy = resolvedSearchParams.sortBy as 'price' | 'createdAt' | 'avgRating' | undefined
  const sortOrder = resolvedSearchParams.sortOrder as 'asc' | 'desc' | undefined

  const [{ data: products, meta }, categories] = await Promise.all([
    fetchProducts({
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
      categorySlug,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    }),
    fetchCategories(),
  ])

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), href: `/${locale}` },
    { name: t('breadcrumbShop'), href: `/${locale}/shop` },
  ])

  // Serialize active filters to pass to CatalogPagination (client cannot access server searchParams)
  const activeSearchParams: Record<string, string> = {}
  if (resolvedSearchParams.categorySlug)
    activeSearchParams.categorySlug = resolvedSearchParams.categorySlug
  if (resolvedSearchParams.minPrice) activeSearchParams.minPrice = resolvedSearchParams.minPrice
  if (resolvedSearchParams.maxPrice) activeSearchParams.maxPrice = resolvedSearchParams.maxPrice
  if (resolvedSearchParams.sortBy) activeSearchParams.sortBy = resolvedSearchParams.sortBy
  if (resolvedSearchParams.sortOrder) activeSearchParams.sortOrder = resolvedSearchParams.sortOrder

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4 py-8">
        <CatalogHeader
          totalCount={meta.totalCount}
          breadcrumbHome={t('breadcrumbHome')}
          breadcrumbShop={t('breadcrumbShop')}
          breadcrumbLabel={t('breadcrumbLabel')}
          title={t('title')}
          productsCount={t('productsCount', { count: meta.totalCount })}
        />

        <div className="flex gap-8">
          <div className="hidden w-64 shrink-0 lg:block">
            {/* CatalogFilters uses useSearchParams — must be wrapped in Suspense */}
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-accent/10" />}>
              <CatalogFilters categories={categories} />
            </Suspense>
          </div>

          <main className="min-w-0 flex-1">
            <Suspense fallback={<ProductGridSkeleton cardCount={PRODUCTS_PER_PAGE} />}>
              <ProductGrid products={products} />
            </Suspense>
            <CatalogPagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
              searchParams={activeSearchParams}
            />
          </main>
        </div>
      </div>
    </>
  )
}

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchProducts, fetchCategories } from '@/lib/api/products'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { ProductGrid } from '@/components/features/catalog/product-grid'
import { ProductGridSkeleton } from '@/components/features/catalog/product-grid-skeleton'
import { CatalogHeader } from './_components/catalog-header'
import { CatalogFilters } from './_components/catalog-filters'
import { CatalogFiltersMobile } from './_components/catalog-filters-mobile'
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

interface HomePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogSearchParams>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'catalog' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}`,
    },
    // canonical points to the locale root — filter combinations must not create duplicate content
    alternates: buildLocaleAlternates(locale, ''),
  }
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params
  const resolvedSearchParams = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('catalog')

  const parsedPage = Number(resolvedSearchParams.page ?? 1)
  const currentPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
  const categorySlug = resolvedSearchParams.categorySlug

  const parsedMinPrice = resolvedSearchParams.minPrice
    ? Number(resolvedSearchParams.minPrice)
    : undefined
  const parsedMaxPrice = resolvedSearchParams.maxPrice
    ? Number(resolvedSearchParams.maxPrice)
    : undefined
  // Discard NaN and negative values; also discard inverted range (minPrice > maxPrice)
  const minPrice =
    parsedMinPrice !== undefined && Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0
      ? parsedMinPrice
      : undefined
  const maxPrice =
    parsedMaxPrice !== undefined && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0
      ? parsedMaxPrice
      : undefined
  const sanitizedMinPrice =
    minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice ? undefined : minPrice
  const sanitizedMaxPrice =
    minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice ? undefined : maxPrice

  const VALID_SORT_FIELDS = new Set(['price', 'createdAt', 'avgRating'])
  const VALID_SORT_ORDERS = new Set(['asc', 'desc'])
  const sortBy = VALID_SORT_FIELDS.has(resolvedSearchParams.sortBy ?? '')
    ? (resolvedSearchParams.sortBy as 'price' | 'createdAt' | 'avgRating')
    : undefined
  const sortOrder = VALID_SORT_ORDERS.has(resolvedSearchParams.sortOrder ?? '')
    ? (resolvedSearchParams.sortOrder as 'asc' | 'desc')
    : undefined

  let products: Awaited<ReturnType<typeof fetchProducts>>['data'] = []
  let meta = { totalCount: 0, totalPages: 1, page: 1, limit: PRODUCTS_PER_PAGE }
  let categories: Awaited<ReturnType<typeof fetchCategories>> = []

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetchProducts({
        page: currentPage,
        limit: PRODUCTS_PER_PAGE,
        categorySlug,
        minPrice: sanitizedMinPrice,
        maxPrice: sanitizedMaxPrice,
        sortBy,
        sortOrder,
      }),
      fetchCategories(),
    ])
    products = productsResponse.data
    meta = productsResponse.meta
    categories = categoriesResponse
  } catch {
    // API unavailable — render empty state rather than crashing the page
  }

  // Serialize active filters to pass to CatalogPagination (client cannot access server searchParams)
  const activeSearchParams: Record<string, string> = {}
  if (resolvedSearchParams.categorySlug)
    activeSearchParams.categorySlug = resolvedSearchParams.categorySlug
  if (resolvedSearchParams.minPrice) activeSearchParams.minPrice = resolvedSearchParams.minPrice
  if (resolvedSearchParams.maxPrice) activeSearchParams.maxPrice = resolvedSearchParams.maxPrice
  if (resolvedSearchParams.sortBy) activeSearchParams.sortBy = resolvedSearchParams.sortBy
  if (resolvedSearchParams.sortOrder) activeSearchParams.sortOrder = resolvedSearchParams.sortOrder

  // Count active filter selections for the mobile badge indicator
  const activeFiltersCount = [
    resolvedSearchParams.categorySlug,
    resolvedSearchParams.minPrice,
    resolvedSearchParams.maxPrice,
    resolvedSearchParams.sortBy,
  ].filter(Boolean).length

  return (
    <div className="container mx-auto px-4 py-8">
      <CatalogHeader
        title={t('title')}
        productsCount={t('productsCount', { count: meta.totalCount })}
      />

      {/* Mobile filters trigger — visible below lg breakpoint */}
      <div className="mb-4 lg:hidden">
        <Suspense fallback={null}>
          <CatalogFiltersMobile categories={categories} activeFiltersCount={activeFiltersCount} />
        </Suspense>
      </div>

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
  )
}

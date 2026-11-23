import { getTranslations } from 'next-intl/server'
import { fetchProducts } from '@/lib/api/products'
import { ProductGrid } from '@/components/features/catalog/product-grid'
import { CatalogPagination } from './catalog-pagination'

interface ProductGridServerProps {
  page: number
  limit: number
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'createdAt' | 'avgRating'
  sortOrder?: 'asc' | 'desc'
  activeSearchParams: Record<string, string>
}

// #501: own Suspense boundary. HomePage no longer awaits the products fetch,
// so the header / filter column flush immediately while this subtree streams.
export async function ProductGridServer({
  page,
  limit,
  categorySlug,
  minPrice,
  maxPrice,
  sortBy,
  sortOrder,
  activeSearchParams,
}: ProductGridServerProps) {
  let products: Awaited<ReturnType<typeof fetchProducts>>['data'] = []
  let meta = { totalCount: 0, totalPages: 1, page: 1, limit }

  try {
    const response = await fetchProducts({
      page,
      limit,
      categorySlug,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    })
    products = response.data
    meta = response.meta
  } catch {
    // API unavailable — render the empty-state grid rather than a 500 page.
  }

  const t = await getTranslations('catalog')

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        {t('productsCount', { count: meta.totalCount })}
      </p>
      <ProductGrid products={products} />
      <CatalogPagination
        currentPage={page}
        totalPages={meta.totalPages}
        searchParams={activeSearchParams}
      />
    </>
  )
}

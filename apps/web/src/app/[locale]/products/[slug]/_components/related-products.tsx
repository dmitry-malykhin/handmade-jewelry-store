import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { fetchProducts } from '@/lib/api/products'
import { ProductCard } from '@/components/features/catalog/product-card'

interface RelatedProductsProps {
  currentSlug: string
  categorySlug?: string
  categoryName?: string
}

const RELATED_PRODUCTS_LIMIT = 4

// #468: pull `limit + 1` so excluding the current product still leaves the
// full rail. A product on the last page of its category may still have < 4
// siblings and that's fine — the rail just shrinks gracefully.
export async function RelatedProducts({
  currentSlug,
  categorySlug,
  categoryName,
}: RelatedProductsProps) {
  if (!categorySlug) return null

  const t = await getTranslations('productDetail')

  let siblings: Product[] = []
  try {
    const response = await fetchProducts({
      categorySlug,
      limit: RELATED_PRODUCTS_LIMIT + 1,
    })
    siblings = response.data.filter((product) => product.slug !== currentSlug)
  } catch {
    return null
  }

  const related = siblings.slice(0, RELATED_PRODUCTS_LIMIT)
  if (related.length === 0) return null

  const heading = categoryName
    ? t('relatedProductsCategoryHeading', { category: categoryName })
    : t('relatedProductsFallbackHeading')

  return (
    <section aria-labelledby="related-products-heading" className="mt-16 border-t pt-12">
      <h2
        id="related-products-heading"
        className="mb-6 font-display text-2xl font-normal text-foreground"
      >
        {heading}
      </h2>
      <ul role="list" className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {related.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}

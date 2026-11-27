import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { ProductCard } from '@/components/features/catalog/product-card'

type PopularRailHeadingKey = 'emptyCartPopularHeading' | 'upsellRailHeading'

interface PopularProductsRailProps {
  products: Product[]
  headingKey: PopularRailHeadingKey
  className?: string
}

// #469: both the empty-cart recovery carousel and the upsell rail under cart
// items share this component. Rendered server-side so it stays SEO-aligned
// with the rest of the catalog and avoids a client fetch waterfall.
export async function PopularProductsRail({
  products,
  headingKey,
  className,
}: PopularProductsRailProps) {
  if (products.length === 0) return null

  const t = await getTranslations('cartPage')

  return (
    <section
      aria-labelledby={`popular-rail-${headingKey}`}
      className={className ?? 'mt-12 border-t pt-8'}
    >
      <h2
        id={`popular-rail-${headingKey}`}
        className="mb-6 font-display text-2xl font-normal text-foreground"
      >
        {t(headingKey)}
      </h2>
      <ul role="list" className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}

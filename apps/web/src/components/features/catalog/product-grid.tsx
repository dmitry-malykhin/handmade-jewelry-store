import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { ProductCard } from './product-card'

interface ProductGridProps {
  products: Product[]
}

export async function ProductGrid({ products }: ProductGridProps) {
  const t = await getTranslations('catalog')

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-foreground">{t('emptyTitle')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('emptyDescription')}</p>
      </div>
    )
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      aria-label={t('productListLabel')}
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} isPriority={index < 4} />
        </li>
      ))}
    </ul>
  )
}

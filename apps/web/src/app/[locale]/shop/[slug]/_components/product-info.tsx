import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/features/cart/add-to-cart-button'
import { ProductDimensions } from './product-dimensions'

interface ProductInfoProps {
  product: Product
}

export async function ProductInfo({ product }: ProductInfoProps) {
  const t = await getTranslations('productDetail')

  const formattedPrice = parseFloat(product.price).toFixed(2)
  const isReadyToShip = product.stock === 1
  const isPermanentlySoldOut = product.stockType === 'ONE_OF_A_KIND' && product.stock === 0
  const isMadeOnDemand = product.stock === 0 && !isPermanentlySoldOut

  return (
    <div className="flex flex-col gap-6">
      {/* Stock type badge */}
      {product.stockType !== 'IN_STOCK' && (
        <Badge variant="secondary" className="w-fit">
          {product.stockType === 'MADE_TO_ORDER' ? t('madeToOrder') : t('oneOfAKind')}
        </Badge>
      )}

      {/* Title — h1 for this page */}
      <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{product.title}</h1>

      {/* Rating */}
      {product.avgRating > 0 && (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-label={t('ratingLabel', { rating: product.avgRating, count: product.reviewCount })}
        >
          <span aria-hidden="true">
            {'★'.repeat(Math.round(product.avgRating))}
            {'☆'.repeat(5 - Math.round(product.avgRating))}
          </span>
          <span>({product.reviewCount})</span>
        </p>
      )}

      {/* Price */}
      <p className="text-3xl font-bold text-foreground">
        <data value={formattedPrice}>${formattedPrice}</data>
      </p>

      {/* Stock + production ETA — always visible so the customer never leaves
          this page guessing when their piece will arrive. */}
      <div
        className={`rounded-lg px-4 py-3 text-sm font-medium ${
          isPermanentlySoldOut
            ? 'bg-destructive/10 text-destructive'
            : isReadyToShip
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
              : 'bg-accent/20 text-foreground'
        }`}
        aria-live="polite"
      >
        {isPermanentlySoldOut && t('permanentlySoldOut')}
        {isReadyToShip && t('inStockShipsFast')}
        {isMadeOnDemand && t('madeOnDemandETA', { days: product.productionDays })}
      </div>

      {/* Add to cart */}
      <div className="flex items-center gap-4">
        <AddToCartButton product={product} />
      </div>

      {/* Material */}
      {product.material && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t('material')}:</span> {product.material}
        </p>
      )}

      {/* Description */}
      <section aria-label={t('descriptionLabel')}>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('descriptionTitle')}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {product.description}
        </p>
      </section>

      {/* Dimensions */}
      <ProductDimensions product={product} />
    </div>
  )
}

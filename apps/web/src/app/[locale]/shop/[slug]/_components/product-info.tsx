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
  // Issue #231 — handmade is always orderable. ONE_OF_A_KIND that's been sold
  // shows a special copy variant ("we can craft a similar one") but the customer
  // can still order; only the visual framing changes.
  const isOneOfAKindReorderable = product.stockType === 'ONE_OF_A_KIND' && product.stock === 0
  const isMadeOnDemand = product.stock === 0 && !isOneOfAKindReorderable

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

      {/* Stock + production + shipping ETA. Two-line structure separates the
          master's precise commitment (top) from the carrier's approximate range
          (helper) — see docs/18_PRODUCTION_VS_SHIPPING_ETA.md for the rationale. */}
      <div
        className={`rounded-lg px-4 py-3 ${
          isReadyToShip
            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
            : 'bg-accent/20 text-foreground'
        }`}
        aria-live="polite"
      >
        {isReadyToShip && (
          <>
            <p className="text-sm font-medium">{t('inStockMainLine')}</p>
            <p className="mt-1 text-xs opacity-80">{t('inStockHelperLine')}</p>
          </>
        )}
        {isOneOfAKindReorderable && (
          <>
            <p className="text-sm font-medium">
              {t('oneOfAKindReorderableMain', { days: product.productionDays })}
            </p>
            <p className="mt-1 text-xs opacity-80">{t('oneOfAKindReorderableHelper')}</p>
          </>
        )}
        {isMadeOnDemand && (
          <>
            <p className="text-sm font-medium">
              {t('madeOnDemandMainLine', { days: product.productionDays })}
            </p>
            <p className="mt-1 text-xs opacity-80">{t('madeOnDemandHelperLine')}</p>
          </>
        )}
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

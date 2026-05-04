import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { AddToCartButton } from '@/components/features/cart/add-to-cart-button'
import { SHIPPING_OPTIONS } from '@/app/[locale]/checkout/_lib/shipping-options'
import { formatLatestDeliveryDate } from '@/app/[locale]/checkout/_lib/format-eta'
import { STUDIO_NAME, STUDIO_CITY } from '@/lib/studio'
import { ProductDimensions } from './product-dimensions'

interface ProductInfoProps {
  product: Product
}

const STANDARD_SHIPPING = SHIPPING_OPTIONS.find((option) => option.id === 'standard')
if (!STANDARD_SHIPPING) {
  throw new Error(
    'Standard shipping option missing from SHIPPING_OPTIONS — check shipping-options.ts',
  )
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

  // Issue #233 — concrete delivery date (under-promise, over-deliver: latest of range).
  const productionDaysForEta = isReadyToShip ? 0 : product.productionDays
  const arriveByDate = formatLatestDeliveryDate(productionDaysForEta, STANDARD_SHIPPING)

  // Issue #233 — premium-min stock indicator: small dot + plain text, no
  // full-width colored block. Each state has its own dot tint and main copy.
  // ─ green dot for in stock (ready to ship today)
  // ─ amber dot for made-on-demand (master crafts)
  // ─ neutral muted dot for ONE_OF_A_KIND reorderable (originally one of a kind)
  let dotColorClass = 'bg-muted-foreground'
  let mainCopy = ''
  let helperCopy = ''
  if (isReadyToShip) {
    dotColorClass = 'bg-green-600 dark:bg-green-400'
    mainCopy = t('inStockMainLine')
    helperCopy = `${t('inStockHelperLine')} · ${t('deliveryByDate', { date: arriveByDate })}`
  } else if (isMadeOnDemand) {
    dotColorClass = 'bg-amber-500 dark:bg-amber-400'
    mainCopy = t('madeOnDemandMainLine', { days: product.productionDays })
    helperCopy = `${t('madeOnDemandHelperLine')} · ${t('deliveryByDate', { date: arriveByDate })}`
  } else if (isOneOfAKindReorderable) {
    dotColorClass = 'bg-muted-foreground'
    mainCopy = t('oneOfAKindReorderableMain', { days: product.productionDays })
    helperCopy = `${t('oneOfAKindReorderableHelper')} · ${t('deliveryByDate', { date: arriveByDate })}`
  }

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

      {/* Stock + production + shipping ETA. Premium-min: small colored dot +
          plain text rather than a full-width colored block. The helper line
          combines the carrier window with a concrete arrival date — the latest
          of the range (under-promise, over-deliver). See docs/19. */}
      <div className="flex flex-col gap-1" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${dotColorClass}`} aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{mainCopy}</p>
        </div>
        <p className="ml-4 text-xs text-muted-foreground">{helperCopy}</p>
      </div>

      {/* Add to cart */}
      <div className="flex items-center gap-4">
        <AddToCartButton product={product} />
      </div>

      {/* Trust block — premium-min row of 3 signals under CTA. Dot-separated,
          muted color, no icons. See docs/19 §5.2 for rationale. */}
      <p className="text-xs text-muted-foreground">
        {t('trustReturns')} · {t('trustSecure')} · {t('trustHandcrafted', { city: STUDIO_CITY })}
      </p>

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

      {/* Maker provenance — single factual line, premium-min tone (Catbird /
          Mejuri pattern). No bio, no photo here; "About the studio" is a
          separate page (post-MVP). */}
      <p className="text-sm text-muted-foreground">{t('makerLine', { studio: STUDIO_NAME })}</p>

      {/* Dimensions */}
      <ProductDimensions product={product} />

      {/* Ring size guide — only on rings (issue #118). Internal link helps
          customers find the right size before adding to cart and improves SEO
          via cross-linking. */}
      {product.category.slug === 'rings' && (
        <Link
          href="/ring-size-guide"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t('ringSizeGuideLink')} →
        </Link>
      )}
    </div>
  )
}

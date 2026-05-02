import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/features/cart/add-to-cart-button'
import { WishlistButton } from '@/components/features/wishlist/wishlist-button'

interface ProductCardProps {
  product: Product
  isPriority?: boolean // true only for first visible card — LCP optimisation
}

export async function ProductCard({ product, isPriority = false }: ProductCardProps) {
  const t = await getTranslations('catalog')

  const primaryImage = product.images[0] ?? '/placeholder-product.jpg'
  const formattedPrice = parseFloat(product.price).toFixed(2)
  // Issue #231 — handmade pieces are always orderable. Even an originally
  // one-of-a-kind sold piece can be re-crafted with a similar stone.
  const isMadeOnDemand = product.stock === 0

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <WishlistButton productId={product.id} variant="card" />
      <Link href={`/shop/${product.slug}`} aria-label={product.title}>
        <figure className="relative aspect-square overflow-hidden bg-accent/10">
          <Image
            src={primaryImage}
            alt={`${product.title} — ${t('imageAlt')}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={isPriority}
          />
        </figure>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.stockType !== 'IN_STOCK' && product.stock > 0 && (
          <Badge variant="secondary" className="w-fit text-xs">
            {product.stockType === 'MADE_TO_ORDER' ? t('madeToOrder') : t('oneOfAKind')}
          </Badge>
        )}
        {isMadeOnDemand && (
          <Badge variant="secondary" className="w-fit text-xs">
            {t('madeOnDemand', { days: product.productionDays })}
          </Badge>
        )}

        <Link href={`/shop/${product.slug}`}>
          <h2 className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
            {product.title}
          </h2>
        </Link>

        {product.avgRating > 0 && (
          <p
            className="text-xs text-muted-foreground"
            aria-label={t('ratingLabel', { rating: product.avgRating, count: product.reviewCount })}
          >
            {'★'.repeat(Math.round(product.avgRating))}
            {'☆'.repeat(5 - Math.round(product.avgRating))}
            <span className="ml-1">({product.reviewCount})</span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-base font-semibold text-foreground">
            <data value={formattedPrice}>${formattedPrice}</data>
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  )
}

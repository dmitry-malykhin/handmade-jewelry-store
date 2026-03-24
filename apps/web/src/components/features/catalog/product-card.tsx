import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'

interface ProductCardProps {
  product: Product
  isPriority?: boolean // true only for first visible card — LCP optimisation
}

export async function ProductCard({ product, isPriority = false }: ProductCardProps) {
  const t = await getTranslations('catalog')

  const primaryImage = product.images[0] ?? '/placeholder-product.jpg'
  const formattedPrice = parseFloat(product.price).toFixed(2)
  const isInStock = product.stock > 0

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
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
          {!isInStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="text-sm font-medium text-muted-foreground">{t('outOfStock')}</span>
            </div>
          )}
        </figure>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.stockType !== 'IN_STOCK' && (
          <Badge variant="secondary" className="w-fit text-xs">
            {product.stockType === 'MADE_TO_ORDER' ? t('madeToOrder') : t('oneOfAKind')}
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

        <p className="mt-auto pt-2 text-base font-semibold text-foreground">
          <data value={formattedPrice}>${formattedPrice}</data>
        </p>
      </div>
    </article>
  )
}

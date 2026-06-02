'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

interface ProductImageGalleryProps {
  images: string[]
  productTitle: string
}

export function ProductImageGallery({ images, productTitle }: ProductImageGalleryProps) {
  const t = useTranslations('productDetail')
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const primaryImage = images[0] ?? '/placeholder-product.jpg'
  const activeImage = images[activeImageIndex] ?? primaryImage

  return (
    <div className="flex flex-col gap-4">
      <figure className="relative aspect-square overflow-hidden rounded-xl bg-accent/10">
        <Image
          src={activeImage}
          alt={`${productTitle} — ${t('imageAlt', { index: activeImageIndex + 1 })}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          // First image is LCP — priority only when it is the active one on initial render
          priority={activeImageIndex === 0}
        />
        <figcaption className="sr-only">
          {productTitle} — {t('imageAlt', { index: activeImageIndex + 1 })}
        </figcaption>
      </figure>

      {images.length > 1 && (
        <ul role="list" className="flex gap-2 overflow-x-auto" aria-label={t('thumbnailsLabel')}>
          {images.map((imageUrl, index) => (
            <li key={imageUrl} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveImageIndex(index)}
                aria-label={t('thumbnailAlt', { index: index + 1 })}
                aria-current={activeImageIndex === index ? 'true' : undefined}
                className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                  activeImageIndex === index
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Image
                  src={imageUrl}
                  alt={`${productTitle} — ${t('imageAlt', { index: index + 1 })}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

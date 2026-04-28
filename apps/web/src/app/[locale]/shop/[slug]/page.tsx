import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchProductBySlug } from '@/lib/api/products'
import { generateBreadcrumbJsonLd, generateProductJsonLd } from '@/lib/seo/json-ld'
import { ReviewsSection } from '@/components/features/reviews/reviews-section'
import { ProductDetail } from './_components/product-detail'

// ISR — same revalidation window as catalog so product data stays fresh
export const revalidate = 3600

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params

  let product
  try {
    product = await fetchProductBySlug(slug)
  } catch {
    return {}
  }

  const description = product.description.slice(0, 160)
  const primaryImage = product.images[0]
  const price = parseFloat(product.price).toFixed(2)
  const availability = product.stock > 0 ? 'in stock' : 'out of stock'

  return {
    // layout template appends "| Handmade Jewelry Store" automatically
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      // 'website' keeps Next.js OpenGraph types happy; product-specific fields below via `other`
      type: 'website',
      ...(primaryImage && {
        images: [{ url: primaryImage, width: 800, height: 800, alt: product.title }],
      }),
    },
    // Pinterest Rich Pins + Facebook product metadata.
    // Pinterest reads og:type=product via OpenGraph Product meta tags for Rich Pins.
    other: {
      'og:type': 'product',
      'product:price:amount': price,
      'product:price:currency': 'USD',
      'product:availability': availability,
      'product:condition': 'new',
      'product:brand': 'Senichka',
      ...(product.sku && { 'product:retailer_item_id': product.sku }),
    },
    // canonical prevents duplicate content across locales and filter combinations
    alternates: {
      canonical: `/${locale}/shop/${slug}`,
      languages: {
        en: `/en/shop/${slug}`,
        ru: `/ru/shop/${slug}`,
        es: `/es/shop/${slug}`,
      },
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations('productDetail')

  let product
  try {
    product = await fetchProductBySlug(slug)
  } catch {
    notFound()
  }

  const productJsonLd = generateProductJsonLd({
    title: product.title,
    description: product.description,
    price: product.price,
    images: product.images,
    slug: product.slug,
    stock: product.stock,
    material: product.material,
    sku: product.sku,
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
  })

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), href: `/${locale}` },
    { name: t('breadcrumbShop'), href: `/${locale}/shop` },
    ...(product.category
      ? [
          {
            name: product.category.name,
            href: `/${locale}/shop?categorySlug=${product.category.slug}`,
          },
        ]
      : []),
    { name: product.title, href: `/${locale}/shop/${slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4 py-8">
        <ProductDetail product={product} />
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          initialAvgRating={product.avgRating}
          initialReviewCount={product.reviewCount}
        />
      </div>
    </>
  )
}

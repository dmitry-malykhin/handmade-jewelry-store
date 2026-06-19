import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchProductBySlug } from '@/lib/api/products'
import { generateBreadcrumbJsonLd, generateProductJsonLd } from '@/lib/seo/json-ld'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { ReviewsSection } from '@/components/features/reviews/reviews-section'
import { ProductDetail } from './_components/product-detail'
import { ProductViewTracker } from './_components/product-view-tracker'

// 1 h ISR — matches the catalog window.
export const revalidate = 3600

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params

  const product = await fetchProductBySlug(slug).catch(() => null)
  if (!product) return {}

  const description = product.description.slice(0, 160)
  const primaryImage = product.images[0]
  const price = parseFloat(product.price).toFixed(2)
  const availability = product.stock > 0 ? 'in stock' : 'out of stock'

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      // 'website' keeps Next.js OpenGraph types happy; product-specific fields go via `other`.
      type: 'website',
      ...(primaryImage && {
        images: [{ url: primaryImage, width: 800, height: 800, alt: product.title }],
      }),
    },
    // Pinterest Rich Pins + Facebook product metadata via OpenGraph Product tags.
    other: {
      'og:type': 'product',
      'product:price:amount': price,
      'product:price:currency': 'USD',
      'product:availability': availability,
      'product:condition': 'new',
      'product:brand': 'Senichka',
      ...(product.sku && { 'product:retailer_item_id': product.sku }),
    },
    alternates: buildLocaleAlternates(locale, `/products/${slug}`),
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  // .catch + sync notFound() instead of try/catch — notFound() throws
  // NEXT_HTTP_ERROR_FALLBACK;404, which a surrounding catch could swallow.
  // Fetch runs before getTranslations so the 404 fires before a Suspense
  // boundary downgrades it to a streamed 200.
  const product = await fetchProductBySlug(slug).catch(() => null)
  if (!product) notFound()

  const t = await getTranslations('productDetail')

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
    ...(product.category
      ? [
          {
            name: product.category.name,
            href: `/${locale}?categorySlug=${product.category.slug}`,
          },
        ]
      : []),
    { name: product.title, href: `/${locale}/products/${slug}` },
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

      <ProductViewTracker
        productId={product.id}
        slug={product.slug}
        title={product.title}
        priceUsd={parseFloat(product.price)}
        categorySlug={product.category?.slug}
        stockType={product.stockType}
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

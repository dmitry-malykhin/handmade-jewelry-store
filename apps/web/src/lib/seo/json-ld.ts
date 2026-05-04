const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Senichka — Handmade Beaded Jewelry',
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    // sameAs lists verified social profiles — update once accounts are created
    sameAs: [] as string[],
  }
}

export interface BreadcrumbItem {
  name: string
  href: string
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  }
}

export interface ProductJsonLdProps {
  title: string
  description: string
  price: string
  images: string[]
  slug: string
  stock: number
  material: string | null
  sku: string | null
  avgRating: number
  reviewCount: number
}

export interface HowToStep {
  name: string
  text: string
}

/**
 * Build a HowTo JSON-LD object — used on the ring size guide (#118) so
 * Google can show rich results for "how to measure ring size" queries.
 *
 * The `name` is the page title; `description` is a one-line summary;
 * `steps` is the ordered list of methods.
 */
export function generateHowToJsonLd({
  name,
  description,
  url,
  steps,
}: {
  name: string
  description: string
  url: string
  steps: HowToStep[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url: `${SITE_URL}${url}`,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

export function generateProductJsonLd(product: ProductJsonLdProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images,
    ...(product.sku && { sku: product.sku }),
    ...(product.material && { material: product.material }),
    ...(product.avgRating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.avgRating,
        reviewCount: product.reviewCount,
      },
    }),
    offers: {
      '@type': 'Offer',
      price: parseFloat(product.price).toFixed(2),
      priceCurrency: 'USD',
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/shop/${product.slug}`,
    },
  }
}

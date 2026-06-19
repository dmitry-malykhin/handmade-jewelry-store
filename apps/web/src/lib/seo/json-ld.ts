import { getSiteUrl } from '@/lib/config/site-url'

const SITE_URL = getSiteUrl()

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
 * Build a HowTo JSON-LD object — used on the ring size guide so Google can
 * show rich results for "how to measure ring size" queries.
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
      url: `${SITE_URL}/products/${product.slug}`,
    },
  }
}

export interface FaqQuestion {
  question: string
  answer: string
}

/**
 * FAQPage JSON-LD — Google uses this to render expandable FAQ rich results
 * directly in the SERP. Eligible only when every Q&A is visible on the page
 * (Google rejects pages where answers are hidden behind login/paywall).
 */
export function generateFaqJsonLd(items: FaqQuestion[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

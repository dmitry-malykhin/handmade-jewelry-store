import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProductViewTracker } from '../product-view-tracker'
import * as posthog from '@/lib/analytics/posthog'
import * as gtag from '@/lib/analytics/gtag'
import * as fbq from '@/lib/analytics/fbq'
import * as pintrk from '@/lib/analytics/pintrk'
import * as klaviyo from '@/lib/analytics/klaviyo'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/analytics/posthog', () => ({ trackProductViewed: vi.fn() }))
vi.mock('@/lib/analytics/gtag', () => ({ trackViewItem: vi.fn() }))
vi.mock('@/lib/analytics/fbq', () => ({ trackFbViewContent: vi.fn() }))
vi.mock('@/lib/analytics/pintrk', () => ({ trackPinPageVisit: vi.fn() }))
vi.mock('@/lib/analytics/klaviyo', () => ({ klaviyoViewedProduct: vi.fn() }))

const productProps = {
  productId: 'prod-1',
  slug: 'sterling-silver-ring',
  title: 'Sterling Silver Ring',
  priceUsd: 49.99,
  categorySlug: 'rings',
  stockType: 'IN_STOCK',
  imageUrl: 'https://cdn.example.com/ring.jpg',
}

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('product-view-tracker')
  await $allureSeverity('normal')
})

describe('ProductViewTracker — dispatches to every consented channel', () => {
  it('fires PostHog product_viewed with full product payload', () => {
    render(<ProductViewTracker {...productProps} />)

    expect(posthog.trackProductViewed).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      slug: 'sterling-silver-ring',
      title: 'Sterling Silver Ring',
      priceUsd: 49.99,
      category: 'rings',
      stockType: 'IN_STOCK',
    })
  })

  it('fires GA4 view_item with id + title + price', () => {
    render(<ProductViewTracker {...productProps} />)

    expect(gtag.trackViewItem).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      title: 'Sterling Silver Ring',
      price: 49.99,
    })
  })

  it('fires FB Pixel ViewContent with content_ids + value', () => {
    render(<ProductViewTracker {...productProps} />)

    expect(fbq.trackFbViewContent).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      price: 49.99,
    })
  })

  it('fires Pinterest pagevisit with product id + price for retargeting audiences', () => {
    render(<ProductViewTracker {...productProps} />)

    expect(pintrk.trackPinPageVisit).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      price: 49.99,
    })
  })

  it('fires Klaviyo Viewed Product with slug + image for browse-abandonment flow', () => {
    render(<ProductViewTracker {...productProps} />)

    expect(klaviyo.klaviyoViewedProduct).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      title: 'Sterling Silver Ring',
      price: 49.99,
      image: 'https://cdn.example.com/ring.jpg',
      slug: 'sterling-silver-ring',
    })
  })

  it('passes undefined image to Klaviyo when the product has no gallery', () => {
    const { imageUrl: _omitted, ...withoutImage } = productProps
    render(<ProductViewTracker {...withoutImage} />)

    expect(klaviyo.klaviyoViewedProduct).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ image: undefined }),
    )
  })
})

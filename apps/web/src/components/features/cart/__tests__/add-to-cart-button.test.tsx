import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AddToCartButton } from '../add-to-cart-button'
import { useCartStore } from '@/store'
import * as posthog from '@/lib/analytics/posthog'
import * as gtag from '@/lib/analytics/gtag'
import * as fbq from '@/lib/analytics/fbq'
import * as klaviyo from '@/lib/analytics/klaviyo'
import * as pintrk from '@/lib/analytics/pintrk'
import type { Product } from '@jewelry/shared'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Stub the i18n Link so the test doesn't drag in next/navigation transitively.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/analytics/posthog', () => ({ trackProductAddedToCart: vi.fn() }))
vi.mock('@/lib/analytics/gtag', () => ({ trackAddToCart: vi.fn() }))
vi.mock('@/lib/analytics/fbq', () => ({ trackFbAddToCart: vi.fn() }))
vi.mock('@/lib/analytics/klaviyo', () => ({ klaviyoAddedToCart: vi.fn() }))
vi.mock('@/lib/analytics/pintrk', () => ({ trackPinAddToCart: vi.fn() }))

const inStockProduct: Product = {
  id: 'prod-1',
  title: 'Sterling Silver Ring',
  slug: 'sterling-silver-ring',
  price: '49.99',
  stock: 5,
  images: ['https://example.com/ring.jpg'],
  sku: 'SSR-001',
  weight: null,
  material: 'Sterling Silver',
  avgRating: 0,
  reviewCount: 0,
  status: 'ACTIVE',
  stockType: 'IN_STOCK',
  productionDays: 0,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  diameterCm: null,
  weightGrams: null,
  beadSizeMm: null,
  categoryId: 'cat-1',
  category: { name: 'Rings', slug: 'rings' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  description: 'A beautiful ring',
}

// stock=0 + IN_STOCK ≠ unavailable in this store — master crafts on demand.
const madeOnDemandProduct: Product = { ...inStockProduct, stock: 0 }
// Truly unavailable: a sold one-of-a-kind piece cannot be remade.
const permanentlySoldOutProduct: Product = {
  ...inStockProduct,
  stock: 0,
  stockType: 'ONE_OF_A_KIND',
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/features')
  await $allureSubSuite('add-to-cart-button')
  await $allureSeverity('normal')
})

describe('AddToCartButton — product not in cart', () => {
  it('renders "Add to cart" button', () => {
    render(<AddToCartButton product={inStockProduct} />)

    // en.json: cart.addToCart = "Add to cart"
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })

  it('adds the product to the cart store when clicked', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    const { items: cartItems } = useCartStore.getState()
    expect(cartItems).toHaveLength(1)
    expect(cartItems[0]?.productId).toBe('prod-1')
    expect(cartItems[0]?.quantity).toBe(1)
  })

  it('stores the correct product snapshot fields in the cart', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    const cartItem = useCartStore.getState().items[0]
    expect(cartItem?.title).toBe('Sterling Silver Ring')
    expect(cartItem?.slug).toBe('sterling-silver-ring')
    expect(cartItem?.price).toBe(49.99)
    expect(cartItem?.image).toBe('https://example.com/ring.jpg')
  })
})

describe('AddToCartButton — product already in cart', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({
        items: [
          {
            productId: 'prod-1',
            slug: 'sterling-silver-ring',
            title: 'Sterling Silver Ring',
            price: 49.99,
            image: 'https://example.com/ring.jpg',
            quantity: 1,
          },
        ],
      })
    })
  })

  it('renders a "View cart" link instead of the add button', () => {
    render(<AddToCartButton product={inStockProduct} />)

    const link = screen.getByRole('link', { name: /view cart/i })
    expect(link).toBeInTheDocument()
    // Locale prefix is added by the i18n Link wrapper — anywhere in the href is enough.
    expect(link.getAttribute('href')).toMatch(/\/cart$/)
  })

  it('does NOT remove the product when the user clicks the View cart link', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('link', { name: /view cart/i }))

    // Removal must happen on the cart page itself — clicking the inline CTA
    // navigates the user there instead of silently emptying the cart.
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('flips to "View cart" immediately after the first click', async () => {
    useCartStore.setState({ items: [] })
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(screen.getByRole('link', { name: /view cart/i })).toBeInTheDocument()
  })
})

describe('AddToCartButton — dispatches add-to-cart to every consented channel', () => {
  const expectedLineValueUsd = 49.99

  it('fires PostHog product_added_to_cart with full product payload', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(posthog.trackProductAddedToCart).toHaveBeenCalledExactlyOnceWith({
      productId: 'prod-1',
      slug: 'sterling-silver-ring',
      title: 'Sterling Silver Ring',
      priceUsd: 49.99,
      quantity: 1,
    })
  })

  it('fires GA4 add_to_cart with unit price + quantity', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(gtag.trackAddToCart).toHaveBeenCalledExactlyOnceWith(
      { productId: 'prod-1', title: 'Sterling Silver Ring', price: 49.99 },
      1,
    )
  })

  it('fires FB Pixel AddToCart with content_ids + added-line value', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(fbq.trackFbAddToCart).toHaveBeenCalledExactlyOnceWith(['prod-1'], expectedLineValueUsd)
  })

  it('fires Klaviyo Added to Cart with added item + line total for abandoned-cart flow', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(klaviyo.klaviyoAddedToCart).toHaveBeenCalledExactlyOnceWith(
      { productId: 'prod-1', title: 'Sterling Silver Ring', price: 49.99, quantity: 1 },
      expectedLineValueUsd,
    )
  })

  it('fires Pinterest addtocart with content_ids + value for shopping ads attribution', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(pintrk.trackPinAddToCart).toHaveBeenCalledExactlyOnceWith(
      ['prod-1'],
      expectedLineValueUsd,
    )
  })
})

describe('AddToCartButton — handmade availability rules', () => {
  it('stays enabled when stock=0 but stockType is IN_STOCK (made on demand)', () => {
    render(<AddToCartButton product={madeOnDemandProduct} />)

    expect(screen.getByRole('button', { name: /add to cart/i })).not.toBeDisabled()
  })

  it('lets the user add a stock=0 IN_STOCK piece to the cart (master will craft it)', async () => {
    render(<AddToCartButton product={madeOnDemandProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('stays active for ONE_OF_A_KIND pieces with stock=0 (re-craftable on demand)', () => {
    render(<AddToCartButton product={permanentlySoldOutProduct} />)

    expect(screen.getByRole('button')).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })
})

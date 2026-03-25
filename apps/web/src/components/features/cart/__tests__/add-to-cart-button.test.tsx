import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AddToCartButton } from '../add-to-cart-button'
import { useCartStore } from '@/store'
import type { Product } from '@jewelry/shared'

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

const outOfStockProduct: Product = { ...inStockProduct, stock: 0 }

beforeEach(() => {
  useCartStore.setState({ items: [] })
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

  it('shows "Added" text when the product is already in the cart', () => {
    render(<AddToCartButton product={inStockProduct} />)

    // en.json: cart.added = "Added"
    expect(screen.getByText('Added')).toBeInTheDocument()
  })

  it('removes the product from the cart when clicked again (toggle off)', async () => {
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button'))

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('shows "Added" state immediately after clicking "Add to cart"', async () => {
    useCartStore.setState({ items: [] })
    render(<AddToCartButton product={inStockProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    // After click the item is in the cart → button switches to "Added" permanently
    expect(screen.getByText('Added')).toBeInTheDocument()
  })
})

describe('AddToCartButton — out of stock', () => {
  it('renders a disabled button when product stock is 0', () => {
    render(<AddToCartButton product={outOfStockProduct} />)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not add anything to the cart when out of stock button is rendered', () => {
    render(<AddToCartButton product={outOfStockProduct} />)

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

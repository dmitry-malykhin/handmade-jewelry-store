import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test-utils'
import { BuyNowButton } from '../buy-now-button'
import type { AddToCartProduct } from '../add-to-cart-button'
import { useCartStore } from '@/store'

// Capture every push() call from the i18n router
const pushMock = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const inStockProduct: AddToCartProduct = {
  id: 'prod-1',
  slug: 'silver-ring',
  title: 'Silver Ring',
  price: '49.99',
  stock: 5,
  stockType: 'IN_STOCK',
  images: ['https://example.com/ring.jpg'],
}

// stock=0 + IN_STOCK ≠ unavailable in this store — master makes on order.
// The button should still be enabled in this case.
const madeOnDemandProduct: AddToCartProduct = { ...inStockProduct, stock: 0 }

// Truly unavailable: a sold one-of-a-kind piece cannot be remade.
const permanentlySoldOutProduct: AddToCartProduct = {
  ...inStockProduct,
  stock: 0,
  stockType: 'ONE_OF_A_KIND',
}

beforeEach(() => {
  pushMock.mockClear()
  useCartStore.setState({ items: [], expressItem: null })
})

describe('BuyNowButton', () => {
  it('renders with the localized "Buy Now" label', () => {
    render(<BuyNowButton product={inStockProduct} />)
    expect(screen.getByRole('button', { name: /buy now/i })).toBeInTheDocument()
  })

  it('stays enabled for stock=0 IN_STOCK pieces — master crafts on order', () => {
    render(<BuyNowButton product={madeOnDemandProduct} />)
    expect(screen.getByRole('button', { name: /buy now/i })).not.toBeDisabled()
  })

  it('is disabled only for sold ONE_OF_A_KIND pieces', () => {
    render(<BuyNowButton product={permanentlySoldOutProduct} />)
    expect(screen.getByRole('button', { name: /buy now/i })).toBeDisabled()
  })

  it('sets expressItem and navigates to /checkout on click', async () => {
    const user = userEvent.setup()
    render(<BuyNowButton product={inStockProduct} />)

    await user.click(screen.getByRole('button', { name: /buy now/i }))

    const expressItem = useCartStore.getState().expressItem
    expect(expressItem).toEqual({
      productId: 'prod-1',
      slug: 'silver-ring',
      title: 'Silver Ring',
      price: 49.99,
      image: 'https://example.com/ring.jpg',
      quantity: 1,
    })
    expect(pushMock).toHaveBeenCalledWith('/checkout')
  })

  it('does NOT touch the regular cart on click', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem({
      productId: 'prod-other',
      slug: 'other',
      title: 'Other',
      price: 20,
      image: '',
    })
    render(<BuyNowButton product={inStockProduct} />)

    await user.click(screen.getByRole('button', { name: /buy now/i }))

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]?.productId).toBe('prod-other')
  })
})

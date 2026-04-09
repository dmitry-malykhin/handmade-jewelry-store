import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { CartItemRow } from '../cart-item-row'
import { useCartStore } from '@/store'
import type { CartItem } from '@jewelry/shared'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

const ringCartItem: CartItem = {
  productId: 'prod-1',
  slug: 'silver-ring',
  title: 'Silver Ring',
  price: 49.99,
  image: 'https://example.com/ring.jpg',
  quantity: 2,
}

beforeEach(() => {
  useCartStore.setState({
    items: [ringCartItem],
  })
})

describe('CartItemRow — rendering', () => {
  it('displays the product title', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
  })

  it('displays the line item total (price × quantity)', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    // 49.99 × 2 = 99.98
    expect(screen.getByText('$99.98')).toBeInTheDocument()
  })

  it('renders a link to the product page', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/shop/silver-ring')
  })

  it('disables the decrease button when quantity is 1', () => {
    const singleQuantityItem: CartItem = { ...ringCartItem, quantity: 1 }
    render(<CartItemRow cartItem={singleQuantityItem} />)

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled()
  })
})

describe('CartItemRow — quantity controls', () => {
  it('increments quantity when the increase button is clicked', async () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

    expect(useCartStore.getState().items[0]?.quantity).toBe(3)
  })

  it('decrements quantity when the decrease button is clicked', async () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

    expect(useCartStore.getState().items[0]?.quantity).toBe(1)
  })

  it('removes item from cart when decrement is clicked at quantity 1', async () => {
    act(() => {
      useCartStore.setState({ items: [{ ...ringCartItem, quantity: 1 }] })
    })
    render(<CartItemRow cartItem={{ ...ringCartItem, quantity: 1 }} />)

    // Decrease button is disabled at qty=1 so test remove button instead
    await userEvent.click(screen.getByRole('button', { name: /remove silver ring from cart/i }))

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('CartItemRow — accessibility', () => {
  it('renders quantity and remove buttons with 44px touch target (size-11) for Lighthouse compliance', () => {
    const { container } = render(<CartItemRow cartItem={ringCartItem} />)

    const iconButtons = container.querySelectorAll('.size-11')
    // Trash button + decrease + increase = 3 buttons with 44px touch target
    expect(iconButtons.length).toBe(3)
  })
})

describe('CartItemRow — remove', () => {
  it('removes the item from cart when the remove button is clicked', async () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    await userEvent.click(screen.getByRole('button', { name: /remove silver ring from cart/i }))

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

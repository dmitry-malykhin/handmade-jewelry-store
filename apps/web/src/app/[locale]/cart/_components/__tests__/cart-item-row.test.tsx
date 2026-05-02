import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@/test-utils'
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
  quantity: 1,
  productionDays: 0, // in stock — ships fast
}

const madeToOrderCartItem: CartItem = {
  productId: 'prod-2',
  slug: 'gold-pendant',
  title: 'Gold Pendant',
  price: 120.0,
  image: 'https://example.com/pendant.jpg',
  quantity: 1,
  productionDays: 5, // made on demand — 5 business days
}

beforeEach(() => {
  useCartStore.setState({ items: [ringCartItem] })
})

describe('CartItemRow — rendering', () => {
  it('displays the product title', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
  })

  it('displays the line item total (price × quantity)', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    // 49.99 × 1 = 49.99
    expect(screen.getByText('$49.99')).toBeInTheDocument()
  })

  it('renders a link to the product page', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/shop/silver-ring')
  })

  it('shows "Ready to ship today" copy when productionDays is 0', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    expect(screen.getByText(/ready to ship today/i)).toBeInTheDocument()
  })

  it('shows the production-only crafting copy with productionDays when > 0', () => {
    render(<CartItemRow cartItem={madeToOrderCartItem} />)

    expect(screen.getByText(/master crafts in 5 business days/i)).toBeInTheDocument()
  })

  it('does NOT mention shipping in the cart row (carrier window is shown at checkout only)', () => {
    render(<CartItemRow cartItem={madeToOrderCartItem} />)

    expect(screen.queryByText(/ships in/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/shipping/i)).not.toBeInTheDocument()
  })

  it('renders the static "Qty 1" indicator (no +/- controls in the handmade model)', () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    expect(screen.getByText(/qty 1/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /increase quantity/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /decrease quantity/i })).not.toBeInTheDocument()
  })
})

describe('CartItemRow — remove', () => {
  it('removes the item from cart when the remove button is clicked', async () => {
    render(<CartItemRow cartItem={ringCartItem} />)

    await userEvent.click(screen.getByRole('button', { name: /remove silver ring from cart/i }))

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('CartItemRow — accessibility', () => {
  it('renders the remove button with a 44px touch target (size-11) for Lighthouse compliance', () => {
    const { container } = render(<CartItemRow cartItem={ringCartItem} />)

    const iconButtons = container.querySelectorAll('.size-11')
    // Only the Trash button remains — quantity controls were removed in #227.
    expect(iconButtons.length).toBe(1)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@/test-utils'
import { CartIconButton } from '../cart-icon-button'
import { useCartStore } from '@/store'

vi.mock('@/i18n/navigation', () => ({
  // Forward all props so Radix Slot can merge aria-label and other attributes
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('CartIconButton — empty cart', () => {
  it('renders a link to /cart', () => {
    render(<CartIconButton />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/cart')
  })

  it('has accessible label containing "Shopping cart" when cart is empty', () => {
    render(<CartIconButton />)

    // Button uses asChild → renders as <a> (role: link)
    // en.json: header.cartItemCount when count=0 → "Shopping cart"
    expect(screen.getByRole('link', { name: /shopping cart/i })).toBeInTheDocument()
  })

  it('does not show a numeric count badge when cart is empty', () => {
    render(<CartIconButton />)

    // The badge span shows a number — if no items, no numeric text should appear
    const badge = screen.queryByText(/^\d+$/)
    expect(badge).not.toBeInTheDocument()
  })
})

describe('CartIconButton — items in cart', () => {
  it('shows the item count badge when there are items', () => {
    act(() => {
      useCartStore.setState({
        items: [
          { productId: 'p1', slug: 'ring', title: 'Ring', price: 50, image: '', quantity: 2 },
        ],
      })
    })

    render(<CartIconButton />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('sums quantities across multiple cart items in the badge', () => {
    act(() => {
      useCartStore.setState({
        items: [
          { productId: 'p1', slug: 'ring', title: 'Ring', price: 50, image: '', quantity: 3 },
          {
            productId: 'p2',
            slug: 'necklace',
            title: 'Necklace',
            price: 80,
            image: '',
            quantity: 1,
          },
        ],
      })
    })

    render(<CartIconButton />)

    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows "99+" when total items exceed 99', () => {
    act(() => {
      useCartStore.setState({
        items: [
          { productId: 'p1', slug: 'ring', title: 'Ring', price: 50, image: '', quantity: 100 },
        ],
      })
    })

    render(<CartIconButton />)

    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})

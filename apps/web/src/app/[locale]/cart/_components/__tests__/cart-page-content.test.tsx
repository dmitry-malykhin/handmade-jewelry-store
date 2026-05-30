import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@/test-utils'
import { CartPageContent } from '../cart-page-content'
import { useCartStore } from '@/store'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('cart-page-content')
  await $allureSeverity('normal')
})

describe('CartPageContent — empty state', () => {
  it('shows the empty cart message when cart has no items', () => {
    render(<CartPageContent />)

    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument()
  })

  it('does not show the cart items list when cart is empty', () => {
    render(<CartPageContent />)

    expect(screen.queryByRole('list', { name: /cart items/i })).not.toBeInTheDocument()
  })
})

describe('CartPageContent — with items', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({
        items: [
          {
            productId: 'p1',
            slug: 'silver-ring',
            title: 'Silver Ring',
            price: 49.99,
            image: '',
            quantity: 1,
          },
          {
            productId: 'p2',
            slug: 'gold-necklace',
            title: 'Gold Necklace',
            price: 89.99,
            image: '',
            quantity: 2,
          },
        ],
      })
    })
  })

  it('shows the cart heading when cart has items', () => {
    render(<CartPageContent />)

    expect(screen.getByRole('heading', { name: /your cart/i })).toBeInTheDocument()
  })

  it('renders a list item for each cart item', () => {
    render(<CartPageContent />)

    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
    expect(screen.getByText('Gold Necklace')).toBeInTheDocument()
  })

  it('renders the cart summary panel alongside the items', () => {
    render(<CartPageContent />)

    expect(screen.getByRole('complementary', { name: /order summary/i })).toBeInTheDocument()
  })
})

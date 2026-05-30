import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@/test-utils'
import { CartSummary } from '../cart-summary'
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
  await $allureSubSuite('cart-summary')
  await $allureSeverity('normal')
})

describe('CartSummary — empty cart', () => {
  it('shows $0.00 total when cart is empty', () => {
    render(<CartSummary />)

    const totalValues = screen.getAllByText('$0.00')
    expect(totalValues.length).toBeGreaterThan(0)
  })

  it('shows free shipping threshold progress bar', () => {
    render(<CartSummary />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})

describe('CartSummary — below free shipping threshold ($30)', () => {
  beforeEach(() => {
    act(() => {
      // $30 total — below $50 free shipping threshold
      useCartStore.setState({
        items: [
          { productId: 'p1', slug: 'ring', title: 'Ring', price: 30, image: '', quantity: 1 },
        ],
      })
    })
  })

  it('shows threshold upsell message with remaining amount', () => {
    render(<CartSummary />)

    // "Add $20.00 more for free shipping"
    expect(screen.getByText(/Add \$20.00 more for free shipping/i)).toBeInTheDocument()
  })

  it('shows "Calculated at checkout" in shipping row', () => {
    render(<CartSummary />)

    expect(screen.getByText('Calculated at checkout')).toBeInTheDocument()
  })
})

describe('CartSummary — above free shipping threshold ($130)', () => {
  beforeEach(() => {
    act(() => {
      // $130 total — above $50 free shipping threshold
      useCartStore.setState({
        items: [
          { productId: 'p1', slug: 'ring', title: 'Ring', price: 50, image: '', quantity: 2 },
          {
            productId: 'p2',
            slug: 'necklace',
            title: 'Necklace',
            price: 30,
            image: '',
            quantity: 1,
          },
        ],
      })
    })
  })

  it('displays the correct subtotal', () => {
    render(<CartSummary />)

    // 50×2 + 30×1 = 130.00
    const totalValues = screen.getAllByText('$130.00')
    expect(totalValues.length).toBeGreaterThan(0)
  })

  it('shows free shipping unlocked message', () => {
    render(<CartSummary />)

    expect(screen.getByText(/unlocked free shipping/i)).toBeInTheDocument()
  })

  it('shows FREE label in shipping row', () => {
    render(<CartSummary />)

    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('shows progress bar at 100%', () => {
    render(<CartSummary />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  })

  it('renders a link to /checkout', () => {
    render(<CartSummary />)

    expect(screen.getByRole('link', { name: /proceed to checkout/i })).toHaveAttribute(
      'href',
      '/checkout',
    )
  })
})

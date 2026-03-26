import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CheckoutOrderSummary } from '../checkout-order-summary'
import { CHECKOUT_SHIPPING_COST } from '../../_lib/build-order-payload'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockCartItems = [
  {
    productId: 'prod-1',
    slug: 'silver-ring',
    title: 'Silver Ring',
    price: 50.0,
    image: '/images/ring.jpg',
    quantity: 2,
  },
  {
    productId: 'prod-2',
    slug: 'gold-necklace',
    title: 'Gold Necklace',
    price: 130.0,
    image: '/images/necklace.jpg',
    quantity: 1,
  },
]

vi.mock('@/store/cart.store', () => ({
  useCartItems: () => mockCartItems,
  useCartTotalPrice: () => 230.0, // 50×2 + 130×1
}))

describe('CheckoutOrderSummary', () => {
  it('renders all cart item titles', () => {
    render(<CheckoutOrderSummary />)

    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
    expect(screen.getByText('Gold Necklace')).toBeInTheDocument()
  })

  it('shows quantity multiplier for items with quantity > 1', () => {
    render(<CheckoutOrderSummary />)

    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('renders the correct line total for a cart item', () => {
    render(<CheckoutOrderSummary />)

    // Silver Ring: 50.00 × 2 = 100.00
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('renders the shipping cost', () => {
    render(<CheckoutOrderSummary />)

    expect(screen.getByText(`$${CHECKOUT_SHIPPING_COST.toFixed(2)}`)).toBeInTheDocument()
  })

  it('renders the correct order total', () => {
    render(<CheckoutOrderSummary />)

    // subtotal 230.00 + shipping 9.99 = 239.99
    const expectedTotal = (230.0 + CHECKOUT_SHIPPING_COST).toFixed(2)
    expect(screen.getByText(`$${expectedTotal}`)).toBeInTheDocument()
  })

  it('renders the aside with accessible label', () => {
    render(<CheckoutOrderSummary />)

    expect(screen.getByRole('complementary', { name: 'orderSummaryLabel' })).toBeInTheDocument()
  })
})

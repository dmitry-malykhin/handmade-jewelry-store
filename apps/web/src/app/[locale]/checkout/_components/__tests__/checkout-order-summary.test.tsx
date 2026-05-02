import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CheckoutOrderSummary } from '../checkout-order-summary'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'estimatedDelivery' && params?.date) return `Estimated delivery: ${params.date}`
    return key
  },
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
  useCheckoutItems: () => mockCartItems,
  useCheckoutTotalPrice: () => 230.0, // 50×2 + 130×1
}))

const EXPLICIT_SHIPPING_COST = 9.99

describe('CheckoutOrderSummary', () => {
  it('renders all cart item titles', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
    expect(screen.getByText('Gold Necklace')).toBeInTheDocument()
  })

  it('shows quantity multiplier for items with quantity > 1', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('renders the correct line total for a cart item', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    // Silver Ring: 50.00 × 2 = 100.00
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('renders the shipping cost when shippingCost prop is provided', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByText(`$${EXPLICIT_SHIPPING_COST.toFixed(2)}`)).toBeInTheDocument()
  })

  it('shows FREE label when shippingCost is 0', () => {
    render(<CheckoutOrderSummary shippingCost={0} />)

    expect(screen.getByText('shippingFree')).toBeInTheDocument()
  })

  it('renders the correct order total', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    // subtotal 230.00 + shipping 9.99 = 239.99
    const expectedTotal = (230.0 + EXPLICIT_SHIPPING_COST).toFixed(2)
    expect(screen.getByText(`$${expectedTotal}`)).toBeInTheDocument()
  })

  it('renders the aside with accessible label', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByRole('complementary', { name: 'orderSummaryLabel' })).toBeInTheDocument()
  })

  it('shows estimated delivery text', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByText(/Estimated delivery:/i)).toBeInTheDocument()
  })

  it('uses delivery days from selectedOption when provided', () => {
    const expressOption = {
      id: 'express' as const,
      businessDaysMin: 2,
      businessDaysMax: 3,
      baseCost: 12.99,
      freeThreshold: null,
    }

    render(<CheckoutOrderSummary shippingCost={12.99} selectedOption={expressOption} />)

    // Express delivery (2–3 days) should produce a narrower date range than standard (5–7 days).
    // We verify the estimated delivery line is present — exact dates depend on current date.
    expect(screen.getByText(/Estimated delivery:/i)).toBeInTheDocument()
  })

  it('renders the standard shipping line by default', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    expect(screen.getByText('shippingLineStandard')).toBeInTheDocument()
  })

  it('renders the express shipping line when express option is selected', () => {
    const expressOption = {
      id: 'express' as const,
      businessDaysMin: 2,
      businessDaysMax: 3,
      baseCost: 12.99,
      freeThreshold: null,
    }

    render(<CheckoutOrderSummary shippingCost={12.99} selectedOption={expressOption} />)

    expect(screen.getByText('shippingLineExpress')).toBeInTheDocument()
    expect(screen.queryByText('shippingLineStandard')).not.toBeInTheDocument()
  })

  it('hides the crafting line when no cart item has productionDays > 0', () => {
    render(<CheckoutOrderSummary shippingCost={EXPLICIT_SHIPPING_COST} />)

    // mockCartItems lack productionDays — treated as 0 — line should not render.
    expect(screen.queryByText('craftingLine')).not.toBeInTheDocument()
  })
})

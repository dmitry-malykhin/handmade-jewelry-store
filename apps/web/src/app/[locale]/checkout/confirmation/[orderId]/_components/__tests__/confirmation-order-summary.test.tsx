import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../../../../messages/en.json'
import type { OrderDetails } from '@/lib/api/orders'
import { ConfirmationOrderSummary } from '../confirmation-order-summary'

const mockOrder: OrderDetails = {
  id: 'order_123',
  status: 'PAID',
  subtotal: 49.98,
  shippingCost: 5.0,
  total: 54.98,
  guestEmail: 'test@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  items: [],
  shippingAddress: {
    fullName: 'Jane Smith',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
}

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  )
}

describe('ConfirmationOrderSummary', () => {
  it('displays shipping address details', () => {
    renderWithIntl(<ConfirmationOrderSummary order={mockOrder} />)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText('Apt 4B')).toBeInTheDocument()
    expect(screen.getByText('New York, NY 10001')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
  })

  it('displays order totals', () => {
    renderWithIntl(<ConfirmationOrderSummary order={mockOrder} />)
    expect(screen.getByText('$49.98')).toBeInTheDocument()
    expect(screen.getByText('$5.00')).toBeInTheDocument()
    expect(screen.getByText('$54.98')).toBeInTheDocument()
  })

  it('shows FREE label when shipping cost is zero', () => {
    const freeShippingOrder = { ...mockOrder, shippingCost: 0, total: 49.98 }
    renderWithIntl(<ConfirmationOrderSummary order={freeShippingOrder} />)
    expect(screen.getByText('FREE')).toBeInTheDocument()
  })

  it('displays the optional addressLine2 when present', () => {
    renderWithIntl(<ConfirmationOrderSummary order={mockOrder} />)
    expect(screen.getByText('Apt 4B')).toBeInTheDocument()
  })

  it('omits addressLine2 when not provided', () => {
    const orderWithoutLine2 = {
      ...mockOrder,
      shippingAddress: { ...mockOrder.shippingAddress, addressLine2: undefined },
    }
    renderWithIntl(<ConfirmationOrderSummary order={orderWithoutLine2} />)
    expect(screen.queryByText('Apt 4B')).not.toBeInTheDocument()
  })
})

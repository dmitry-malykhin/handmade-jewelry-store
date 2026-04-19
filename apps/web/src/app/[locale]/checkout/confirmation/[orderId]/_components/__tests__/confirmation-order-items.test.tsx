import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../../../../messages/en.json'
import type { OrderItem } from '@/lib/api/orders'
import { ConfirmationOrderItems } from '../confirmation-order-items'

const mockOrderItems: OrderItem[] = [
  {
    id: 'item_1',
    productId: 'prod_1',
    quantity: 2,
    price: 24.99,
    productSnapshot: {
      title: 'Beaded Amazonite Bracelet',
      slug: 'beaded-amazonite-bracelet',
      image: undefined,
    },
  },
  {
    id: 'item_2',
    productId: 'prod_2',
    quantity: 1,
    price: 49.99,
    productSnapshot: {
      title: 'Sterling Silver Ring',
      slug: 'sterling-silver-ring',
      image: 'https://example.com/ring.jpg',
    },
  },
]

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  )
}

describe('ConfirmationOrderItems', () => {
  it('renders all order items', () => {
    renderWithIntl(<ConfirmationOrderItems items={mockOrderItems} />)
    expect(screen.getByText('Beaded Amazonite Bracelet')).toBeInTheDocument()
    expect(screen.getByText('Sterling Silver Ring')).toBeInTheDocument()
  })

  it('shows item quantity', () => {
    renderWithIntl(<ConfirmationOrderItems items={mockOrderItems} />)
    expect(screen.getByText('Qty: 2')).toBeInTheDocument()
    expect(screen.getByText('Qty: 1')).toBeInTheDocument()
  })

  it('shows line total (price × quantity)', () => {
    renderWithIntl(<ConfirmationOrderItems items={mockOrderItems} />)
    // item_1: 24.99 × 2 = $49.98
    expect(screen.getByText('$49.98')).toBeInTheDocument()
    // item_2: 49.99 × 1 = $49.99
    expect(screen.getByText('$49.99')).toBeInTheDocument()
  })

  it('renders a product image when the snapshot has one', () => {
    renderWithIntl(<ConfirmationOrderItems items={mockOrderItems} />)
    const image = screen.getByAltText('Sterling Silver Ring')
    expect(image).toBeInTheDocument()
  })

  it('renders a placeholder when the snapshot has no image', () => {
    renderWithIntl(<ConfirmationOrderItems items={[mockOrderItems[0]]} />)
    expect(screen.queryByAltText('Beaded Amazonite Bracelet')).not.toBeInTheDocument()
    // placeholder monogram is rendered
    expect(screen.getByAltText('Senichka')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../../../../messages/en.json'
import { PaymentFailedContent } from '../payment-failed-content'

const ORDER_ID = 'cmn9h19k8000i1djemmcs10tz'

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  )
}

describe('PaymentFailedContent — payment failed', () => {
  it('displays the payment failed heading', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={false} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment failed')
  })

  it('displays the "card was not charged" subtitle', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={false} />)

    expect(screen.getByText(/not charged/i)).toBeInTheDocument()
  })

  it('renders a "Try Again" link pointing to /checkout', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={false} />)

    const tryAgainLink = screen.getByRole('link', { name: /try again/i })
    expect(tryAgainLink).toBeInTheDocument()
    expect(tryAgainLink).toHaveAttribute('href', '/checkout')
  })

  it('renders a "Back to Cart" link', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={false} />)

    const backToCartLink = screen.getByRole('link', { name: /back to cart/i })
    expect(backToCartLink).toBeInTheDocument()
    expect(backToCartLink).toHaveAttribute('href', '/cart')
  })
})

describe('PaymentFailedContent — payment cancelled', () => {
  it('displays the payment cancelled heading', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={true} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment cancelled')
  })

  it('displays the "cart is still saved" subtitle', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={true} />)

    expect(screen.getByText(/cart is still saved/i)).toBeInTheDocument()
  })

  it('does not render the "Try Again" button when payment was cancelled', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={true} />)

    expect(screen.queryByRole('link', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders the "Back to Cart" link when payment was cancelled', () => {
    renderWithIntl(<PaymentFailedContent orderId={ORDER_ID} wasCancelled={true} />)

    expect(screen.getByRole('link', { name: /back to cart/i })).toBeInTheDocument()
  })
})

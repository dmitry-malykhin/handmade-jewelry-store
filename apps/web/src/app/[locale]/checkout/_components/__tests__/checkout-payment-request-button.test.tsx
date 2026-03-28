import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckoutPaymentRequestButton } from '../checkout-payment-request-button'
import type { PaymentRequest } from '@stripe/stripe-js'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockPaymentRequestButtonElement = vi.fn(({ options }: { options: unknown }) => (
  <div
    data-testid="payment-request-button-element"
    data-has-payment-request={String(Boolean(options))}
  />
))

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentRequestButtonElement: (props: { options: unknown }) =>
    mockPaymentRequestButtonElement(props),
}))

const mockPaymentRequest = {} as PaymentRequest

describe('CheckoutPaymentRequestButton', () => {
  it('renders the Stripe PaymentRequestButtonElement', () => {
    render(<CheckoutPaymentRequestButton paymentRequest={mockPaymentRequest} />)

    expect(screen.getByTestId('payment-request-button-element')).toBeInTheDocument()
  })

  it('passes the paymentRequest to PaymentRequestButtonElement options', () => {
    render(<CheckoutPaymentRequestButton paymentRequest={mockPaymentRequest} />)

    expect(mockPaymentRequestButtonElement).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          paymentRequest: mockPaymentRequest,
        }),
      }),
    )
  })

  it('has an accessible aria-label wrapping the button', () => {
    const { container } = render(
      <CheckoutPaymentRequestButton paymentRequest={mockPaymentRequest} />,
    )

    // The wrapping div carries aria-label="paymentTitle" (translated key)
    expect(container.querySelector('[aria-label="paymentTitle"]')).toBeInTheDocument()
  })

  it('configures button style with buy type, dark theme, and tall height', () => {
    render(<CheckoutPaymentRequestButton paymentRequest={mockPaymentRequest} />)

    expect(mockPaymentRequestButtonElement).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          style: {
            paymentRequestButton: {
              type: 'buy',
              theme: 'dark',
              height: '52px',
            },
          },
        }),
      }),
    )
  })
})

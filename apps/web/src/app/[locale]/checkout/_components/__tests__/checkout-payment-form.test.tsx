import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckoutPaymentForm } from '../checkout-payment-form'
import type { CheckoutAddressFormValues } from '../checkout-address-schema'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

vi.mock('../checkout-order-summary', () => ({
  CheckoutOrderSummary: () => <div data-testid="checkout-order-summary" />,
}))

vi.mock('../checkout-steps', () => ({
  CheckoutSteps: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="checkout-steps" data-step={currentStep} />
  ),
}))

vi.mock('../checkout-stripe-form', () => ({
  CheckoutStripeForm: () => <div data-testid="checkout-stripe-form" />,
}))

vi.mock('@/store/cart.store', () => ({
  useCheckoutTotalPrice: () => 49.98,
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}))

// Default: loading state
vi.mock('../hooks/use-initiate-checkout', () => ({
  useInitiateCheckout: vi.fn(() => ({
    orderId: null,
    clientSecret: null,
    isLoading: true,
    error: null,
  })),
}))

const mockAddressValues: CheckoutAddressFormValues = {
  email: 'buyer@example.com',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  addressLine2: '',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  phone: '',
}

describe('CheckoutPaymentForm', () => {
  it('shows step 3 in the progress indicator', () => {
    render(
      <CheckoutPaymentForm
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByTestId('checkout-steps')).toHaveAttribute('data-step', '3')
  })

  it('shows loading skeleton while initiating checkout', () => {
    render(
      <CheckoutPaymentForm
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('paymentLoading')).toBeInTheDocument()
  })

  it('renders CheckoutOrderSummary alongside the payment form', () => {
    render(
      <CheckoutPaymentForm
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByTestId('checkout-order-summary')).toBeInTheDocument()
  })

  it('shows error message when checkout initiation fails', async () => {
    const { useInitiateCheckout } = await import('../hooks/use-initiate-checkout')
    vi.mocked(useInitiateCheckout).mockReturnValueOnce({
      orderId: null,
      clientSecret: null,
      isLoading: false,
      error: new Error('Network error'),
    })

    render(
      <CheckoutPaymentForm
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('initiateCheckoutError')).toBeInTheDocument()
  })

  it('renders Stripe Elements when clientSecret and orderId are available', async () => {
    const { useInitiateCheckout } = await import('../hooks/use-initiate-checkout')
    vi.mocked(useInitiateCheckout).mockReturnValueOnce({
      orderId: 'order_123',
      clientSecret: 'pi_test_secret',
      isLoading: false,
      error: null,
    })

    render(
      <CheckoutPaymentForm
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument()
    expect(screen.getByTestId('checkout-stripe-form')).toBeInTheDocument()
  })
})

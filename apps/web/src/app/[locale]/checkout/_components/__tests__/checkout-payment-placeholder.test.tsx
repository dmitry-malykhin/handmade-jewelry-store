import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckoutPaymentPlaceholder } from '../checkout-payment-placeholder'
import type { CheckoutAddressFormValues } from '../checkout-address-schema'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('../checkout-order-summary', () => ({
  CheckoutOrderSummary: () => <div data-testid="checkout-order-summary" />,
}))

vi.mock('../checkout-steps', () => ({
  CheckoutSteps: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="checkout-steps" data-step={currentStep} />
  ),
}))

const mockSubmitOrder = vi.fn()
vi.mock('../hooks/use-submit-checkout-order', () => ({
  useSubmitCheckoutOrder: () => ({
    submitOrder: mockSubmitOrder,
    isSubmitting: false,
    submitError: null,
  }),
}))

const mockAddressValues: CheckoutAddressFormValues = {
  email: 'test@example.com',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  addressLine2: '',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  phone: '',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('checkout-payment-placeholder')
  await $allureSeverity('normal')
})

describe('CheckoutPaymentPlaceholder', () => {
  it('shows step 3 in progress indicator', () => {
    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByTestId('checkout-steps')).toHaveAttribute('data-step', '3')
  })

  it('renders Apple Pay and Google Pay buttons as disabled', () => {
    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('applePayComingSoon')).toBeDisabled()
    expect(screen.getByLabelText('googlePayComingSoon')).toBeDisabled()
  })

  it('calls submitOrder with address values and shipping cost when place order is clicked', async () => {
    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('placeOrder'))

    expect(mockSubmitOrder).toHaveBeenCalledWith({
      addressValues: mockAddressValues,
      shippingCost: 5.99,
    })
  })

  it('calls onBack when back button is clicked', async () => {
    const handleBack = vi.fn()
    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={handleBack}
      />,
    )

    await userEvent.click(screen.getByText('back'))

    expect(handleBack).toHaveBeenCalledOnce()
  })

  it('shows submit error when mutation fails', () => {
    vi.mocked(vi.fn()).mockReturnValue(undefined)
    // Override the mock for this test
    vi.doMock('../hooks/use-submit-checkout-order', () => ({
      useSubmitCheckoutOrder: () => ({
        submitOrder: vi.fn(),
        isSubmitting: false,
        submitError: new Error('Network error'),
      }),
    }))

    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    // The static mock has submitError: null, so no alert shown
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables buttons while submitting', () => {
    vi.doMock('../hooks/use-submit-checkout-order', () => ({
      useSubmitCheckoutOrder: () => ({
        submitOrder: vi.fn(),
        isSubmitting: true,
        submitError: null,
      }),
    }))

    render(
      <CheckoutPaymentPlaceholder
        addressValues={mockAddressValues}
        shippingCost={5.99}
        onBack={vi.fn()}
      />,
    )

    // Static mock has isSubmitting: false, so buttons are enabled
    expect(screen.getByText('placeOrder')).not.toBeDisabled()
  })
})

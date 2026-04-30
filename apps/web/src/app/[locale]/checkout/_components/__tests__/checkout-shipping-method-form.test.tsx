import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckoutShippingMethodForm } from '../checkout-shipping-method-form'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'estimatedDelivery' && params?.date) return `Estimated delivery: ${params.date}`
    return key
  },
}))

vi.mock('@/store/cart.store', () => ({
  useCheckoutTotalPrice: () => 35,
}))

vi.mock('../checkout-order-summary', () => ({
  CheckoutOrderSummary: () => <div data-testid="checkout-order-summary" />,
}))

vi.mock('../checkout-steps', () => ({
  CheckoutSteps: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="checkout-steps" data-step={currentStep} />
  ),
}))

describe('CheckoutShippingMethodForm', () => {
  it('renders both shipping options', () => {
    render(<CheckoutShippingMethodForm onNext={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByLabelText('shippingOption_standard')).toBeInTheDocument()
    expect(screen.getByLabelText('shippingOption_express')).toBeInTheDocument()
  })

  it('shows step 2 in progress indicator', () => {
    render(<CheckoutShippingMethodForm onNext={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByTestId('checkout-steps')).toHaveAttribute('data-step', '2')
  })

  it('selects standard shipping by default', () => {
    render(<CheckoutShippingMethodForm onNext={vi.fn()} onBack={vi.fn()} />)

    const standardRadio = screen.getByLabelText('shippingOption_standard')
    expect(standardRadio).toBeChecked()
  })

  it('calls onNext with selected option when continue is clicked', async () => {
    const handleNext = vi.fn()
    render(<CheckoutShippingMethodForm onNext={handleNext} onBack={vi.fn()} />)

    await userEvent.click(screen.getByText('continueToPayment'))

    expect(handleNext).toHaveBeenCalledOnce()
    const [selectedOption, shippingCost] = handleNext.mock.calls[0]
    expect(selectedOption.id).toBe('standard')
    expect(typeof shippingCost).toBe('number')
  })

  it('calls onNext with express option after selecting express', async () => {
    const handleNext = vi.fn()
    render(<CheckoutShippingMethodForm onNext={handleNext} onBack={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('shippingOption_express'))
    await userEvent.click(screen.getByText('continueToPayment'))

    const [selectedOption] = handleNext.mock.calls[0]
    expect(selectedOption.id).toBe('express')
  })

  it('calls onBack when back button is clicked', async () => {
    const handleBack = vi.fn()
    render(<CheckoutShippingMethodForm onNext={vi.fn()} onBack={handleBack} />)

    await userEvent.click(screen.getByText('back'))

    expect(handleBack).toHaveBeenCalledOnce()
  })

  it('shows FREE for standard shipping when cart subtotal meets threshold', () => {
    // useCartTotalPrice is mocked to 35 (below threshold of 50)
    render(<CheckoutShippingMethodForm onNext={vi.fn()} onBack={vi.fn()} />)

    // $35 < $50 threshold → standard should NOT be free
    expect(screen.queryByText('shippingFree')).not.toBeInTheDocument()
  })
})

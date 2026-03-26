import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckoutSteps } from '../checkout-steps'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

describe('CheckoutSteps', () => {
  it('renders all 3 step numbers', () => {
    render(<CheckoutSteps currentStep={1} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('marks the current step with aria-current="step"', () => {
    render(<CheckoutSteps currentStep={2} />)

    const currentStepEl = screen.getByText('2')
    expect(currentStepEl).toHaveAttribute('aria-current', 'step')
  })

  it('does not set aria-current on non-current steps', () => {
    render(<CheckoutSteps currentStep={1} />)

    expect(screen.getByText('2')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('3')).not.toHaveAttribute('aria-current')
  })

  it('renders the nav with accessible label', () => {
    render(<CheckoutSteps currentStep={1} />)

    expect(screen.getByRole('navigation', { name: 'stepsLabel' })).toBeInTheDocument()
  })

  it('renders step labels from translations', () => {
    render(<CheckoutSteps currentStep={1} />)

    expect(screen.getByText('stepShipping')).toBeInTheDocument()
    expect(screen.getByText('stepShippingMethod')).toBeInTheDocument()
    expect(screen.getByText('stepPayment')).toBeInTheDocument()
  })
})

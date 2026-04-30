import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { CheckoutEntry } from '../checkout-entry'
import { useAuthStore } from '@/store/auth.store'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Stub out multi-step children to keep tests focused on CheckoutEntry routing logic
vi.mock('../checkout-address-form', () => ({
  CheckoutAddressForm: ({ onNext }: { onNext: (values: unknown) => void }) => (
    <div data-testid="checkout-address-form">
      <button onClick={() => onNext({ email: 'test@test.com' })}>submit-address</button>
    </div>
  ),
}))

vi.mock('../checkout-shipping-method-form', () => ({
  CheckoutShippingMethodForm: ({
    onNext,
    onBack,
  }: {
    onNext: (option: unknown, cost: number) => void
    onBack: () => void
  }) => (
    <div data-testid="checkout-shipping-method-form">
      <button onClick={() => onNext({ id: 'standard' }, 5.99)}>submit-shipping</button>
      <button onClick={onBack}>back-shipping</button>
    </div>
  ),
}))

vi.mock('../checkout-payment-form', () => ({
  CheckoutPaymentForm: ({
    onBack,
    selectedShippingOption,
  }: {
    onBack: () => void
    selectedShippingOption?: { id: string }
  }) => (
    <div
      data-testid="checkout-payment-placeholder"
      data-shipping-option={selectedShippingOption?.id}
    >
      <button onClick={onBack}>back-payment</button>
    </div>
  ),
}))

// Reset auth state between tests so the skip-gateway behaviour is deterministic.
beforeEach(() => {
  useAuthStore.getState().clearTokens()
})

describe('CheckoutEntry — gateway screen', () => {
  it('renders the entry screen with guest and auth options', () => {
    render(<CheckoutEntry />)

    expect(screen.getByText('entryTitle')).toBeInTheDocument()
    expect(screen.getByText('continueAsGuest')).toBeInTheDocument()
    expect(screen.getByText('signIn')).toBeInTheDocument()
  })

  it('does not show address form on initial render', () => {
    render(<CheckoutEntry />)

    expect(screen.queryByTestId('checkout-address-form')).not.toBeInTheDocument()
  })

  it('renders Sign In as a link to /login', () => {
    render(<CheckoutEntry />)

    const signInLink = screen.getByRole('link', { name: 'signIn' })
    expect(signInLink).toHaveAttribute('href', '/login')
  })
})

describe('CheckoutEntry — multi-step flow', () => {
  it('shows address form (step 1) after clicking "Continue as Guest"', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))

    expect(screen.getByTestId('checkout-address-form')).toBeInTheDocument()
  })

  it('moves to shipping method form (step 2) after address is submitted', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))
    await userEvent.click(screen.getByText('submit-address'))

    expect(screen.getByTestId('checkout-shipping-method-form')).toBeInTheDocument()
  })

  it('moves to payment placeholder (step 3) after shipping method is selected', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))
    await userEvent.click(screen.getByText('submit-address'))
    await userEvent.click(screen.getByText('submit-shipping'))

    expect(screen.getByTestId('checkout-payment-placeholder')).toBeInTheDocument()
  })

  it('goes back to address form when back is clicked on shipping method step', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))
    await userEvent.click(screen.getByText('submit-address'))
    await userEvent.click(screen.getByText('back-shipping'))

    expect(screen.getByTestId('checkout-address-form')).toBeInTheDocument()
  })

  it('passes selectedShippingOption to payment step', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))
    await userEvent.click(screen.getByText('submit-address'))
    await userEvent.click(screen.getByText('submit-shipping'))

    const paymentStep = screen.getByTestId('checkout-payment-placeholder')
    expect(paymentStep).toHaveAttribute('data-shipping-option', 'standard')
  })

  it('goes back to shipping method when back is clicked on payment step', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))
    await userEvent.click(screen.getByText('submit-address'))
    await userEvent.click(screen.getByText('submit-shipping'))
    await userEvent.click(screen.getByText('back-payment'))

    expect(screen.getByTestId('checkout-shipping-method-form')).toBeInTheDocument()
  })
})

describe('CheckoutEntry — authenticated user skips the gateway', () => {
  // Stand-in JWT — three dot-separated segments; only the middle base64-encoded
  // payload is decoded by the auth store. role/user fields are not used here.
  const fakeJwt =
    'header.' + btoa(JSON.stringify({ sub: 'u1', email: 't@test.com', role: 'USER' })) + '.sig'

  it('renders the address form (step 1) directly when user is logged in', async () => {
    useAuthStore.getState().setTokens(fakeJwt, 'refresh-token')

    render(<CheckoutEntry />)

    // Skip-gateway runs in a useEffect so the address form appears asynchronously.
    await waitFor(() => {
      expect(screen.getByTestId('checkout-address-form')).toBeInTheDocument()
    })
    expect(screen.queryByText('continueAsGuest')).not.toBeInTheDocument()
  })

  it('still shows the gateway when the user is NOT authenticated', () => {
    render(<CheckoutEntry />)

    expect(screen.getByText('continueAsGuest')).toBeInTheDocument()
    expect(screen.queryByTestId('checkout-address-form')).not.toBeInTheDocument()
  })
})

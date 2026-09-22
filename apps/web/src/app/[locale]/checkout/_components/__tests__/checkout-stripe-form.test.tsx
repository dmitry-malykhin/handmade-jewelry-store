import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test-utils'
import { CheckoutStripeForm } from '../checkout-stripe-form'
import * as ordersApi from '@/lib/api/orders'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const confirmPayment = vi.fn().mockResolvedValue({ error: undefined })
const stripeInstance = { confirmPayment }

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => stripeInstance,
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="stripe-payment-element" />,
}))

vi.mock('../hooks/use-payment-request', () => ({
  usePaymentRequest: () => ({ paymentRequest: null, canMakePayment: false }),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'user-jwt' }),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale/checkout')
  await $allureSubSuite('checkout-stripe-form')
  await $allureSeverity('critical')
})

const defaultProps = {
  orderId: 'order-1',
  orderAccessToken: 'order-tok',
  totalAmount: 5499,
  clientSecret: 'pi_secret',
  returnUrl: 'https://example.com/return',
  isSubmitting: false,
  onSubmittingChange: vi.fn(),
  onBack: vi.fn(),
}

describe('CheckoutStripeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmPayment.mockResolvedValue({ error: undefined })
    vi.spyOn(ordersApi, 'acceptOrderTerms').mockResolvedValue({ id: 'terms-1' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the acknowledgement summary, the consent checkbox and the CRD-safe CTA', () => {
    render(<CheckoutStripeForm {...defaultProps} />)

    expect(screen.getByText(/before you place your order/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order.*\$54\.99/i })).toBeInTheDocument()
  })

  it('blocks payment and never touches Stripe when the consent checkbox is unchecked', async () => {
    const user = userEvent.setup()
    render(<CheckoutStripeForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/accept the terms/i)
    expect(ordersApi.acceptOrderTerms).not.toHaveBeenCalled()
    expect(confirmPayment).not.toHaveBeenCalled()
  })

  it('records terms then confirms payment when the checkbox is ticked', async () => {
    const user = userEvent.setup()
    render(<CheckoutStripeForm {...defaultProps} />)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    await waitFor(() =>
      expect(ordersApi.acceptOrderTerms).toHaveBeenCalledWith(
        'order-1',
        {
          termsVersion: 'v1-2026-09',
          privacyVersion: 'v1-2026-09',
          refundPolicyVersion: 'v1-2026-09',
        },
        { accessToken: 'user-jwt', orderAccessToken: 'order-tok' },
      ),
    )
    await waitFor(() => expect(confirmPayment).toHaveBeenCalled())
  })

  it('does NOT call confirmPayment if terms recording fails', async () => {
    vi.spyOn(ordersApi, 'acceptOrderTerms').mockRejectedValueOnce(new Error('server down'))
    const user = userEvent.setup()
    render(<CheckoutStripeForm {...defaultProps} />)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/server down/i)
    expect(confirmPayment).not.toHaveBeenCalled()
  })
})

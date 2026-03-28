import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePaymentRequest } from '../use-payment-request'

const mockRouterPush = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

// Stripe PaymentRequest mock — default resolves to null (browser doesn't support)
// Individual tests override with mockResolvedValueOnce when they need it to succeed
const mockPaymentRequestOn = vi.fn()
const mockCanMakePayment = vi.fn().mockResolvedValue(null)
const mockPaymentRequest = {
  canMakePayment: mockCanMakePayment,
  on: mockPaymentRequestOn,
}

const mockConfirmCardPayment = vi.fn()
const mockStripe = {
  paymentRequest: vi.fn(() => mockPaymentRequest),
  confirmCardPayment: mockConfirmCardPayment,
}

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => mockStripe,
}))

const defaultParams = {
  totalAmountInCents: 4998,
  clientSecret: 'pi_test_secret',
  orderId: 'order_abc',
  locale: 'en',
}

describe('usePaymentRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets canMakePayment to true when browser supports native pay', async () => {
    mockCanMakePayment.mockResolvedValueOnce({ applePay: true })

    const { result } = renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(result.current.canMakePayment).toBe(true))

    expect(result.current.paymentRequest).toBe(mockPaymentRequest)
  })

  it('leaves canMakePayment false when browser does not support native pay', async () => {
    mockCanMakePayment.mockResolvedValueOnce(null)

    const { result } = renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(mockCanMakePayment).toHaveBeenCalled())

    expect(result.current.canMakePayment).toBe(false)
    expect(result.current.paymentRequest).toBeNull()
  })

  it('creates paymentRequest with correct country, currency and amount', async () => {
    mockCanMakePayment.mockResolvedValueOnce(null)

    renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(mockStripe.paymentRequest).toHaveBeenCalled())

    expect(mockStripe.paymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'US',
        currency: 'usd',
        total: expect.objectContaining({ amount: 4998 }),
        requestPayerName: true,
        requestPayerEmail: true,
      }),
    )
  })

  it('registers a paymentmethod event listener on the paymentRequest', async () => {
    mockCanMakePayment.mockResolvedValueOnce(null)

    renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(mockPaymentRequestOn).toHaveBeenCalled())

    expect(mockPaymentRequestOn).toHaveBeenCalledWith('paymentmethod', expect.any(Function))
  })

  it('redirects to confirmation page after successful payment via native pay', async () => {
    mockCanMakePayment.mockResolvedValueOnce({ applePay: true })
    mockConfirmCardPayment.mockResolvedValueOnce({
      paymentIntent: { status: 'succeeded' },
      error: undefined,
    })

    renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(mockPaymentRequestOn).toHaveBeenCalled())

    // Extract and invoke the paymentmethod handler directly
    const paymentMethodHandler = mockPaymentRequestOn.mock.calls.find(
      ([event]) => event === 'paymentmethod',
    )?.[1]

    const mockEvent = {
      paymentMethod: { id: 'pm_test_123' },
      complete: vi.fn(),
    }

    await act(async () => {
      await paymentMethodHandler(mockEvent)
    })

    expect(mockEvent.complete).toHaveBeenCalledWith('success')
    expect(mockRouterPush).toHaveBeenCalledWith('/en/checkout/confirmation/order_abc')
  })

  it('calls event.complete("fail") and sets error when confirmCardPayment fails', async () => {
    mockCanMakePayment.mockResolvedValueOnce({ applePay: true })
    mockConfirmCardPayment.mockResolvedValueOnce({
      paymentIntent: undefined,
      error: { message: 'Card declined' },
    })

    const { result } = renderHook(() => usePaymentRequest(defaultParams))

    await waitFor(() => expect(mockPaymentRequestOn).toHaveBeenCalled())

    const paymentMethodHandler = mockPaymentRequestOn.mock.calls.find(
      ([event]) => event === 'paymentmethod',
    )?.[1]

    const mockEvent = {
      paymentMethod: { id: 'pm_test_fail' },
      complete: vi.fn(),
    }

    await act(async () => {
      await paymentMethodHandler(mockEvent)
    })

    expect(mockEvent.complete).toHaveBeenCalledWith('fail')
    expect(result.current.paymentRequestError).toBe('Card declined')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})

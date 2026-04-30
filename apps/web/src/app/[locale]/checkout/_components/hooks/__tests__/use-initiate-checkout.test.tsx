import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useInitiateCheckout } from '../use-initiate-checkout'
import * as ordersApi from '@/lib/api/orders'
import * as paymentsApi from '@/lib/api/payments'
import type { CheckoutAddressFormValues } from '../../checkout-address-schema'

vi.mock('@/store/cart.store', () => ({
  useCheckoutItems: () => [
    {
      productId: 'prod_1',
      title: 'Silver Ring',
      slug: 'silver-ring',
      price: 49.98,
      quantity: 1,
      image: '/img/ring.jpg',
    },
  ],
}))

vi.mock('@/lib/api/orders', () => ({
  createOrder: vi.fn(),
}))

vi.mock('@/lib/api/payments', () => ({
  createPaymentIntent: vi.fn(),
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

describe('useInitiateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an order and payment intent on mount, returns orderId and clientSecret', async () => {
    vi.mocked(ordersApi.createOrder).mockResolvedValueOnce({
      id: 'order_abc',
      status: 'PENDING',
      total: 55.97,
    })
    vi.mocked(paymentsApi.createPaymentIntent).mockResolvedValueOnce({
      clientSecret: 'pi_test_secret_xyz',
    })

    const { result } = renderHook(() => useInitiateCheckout(mockAddressValues, 5.99))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.orderId).toBe('order_abc')
    expect(result.current.clientSecret).toBe('pi_test_secret_xyz')
    expect(result.current.error).toBeNull()
  })

  it('sets error when createOrder fails', async () => {
    vi.mocked(ordersApi.createOrder).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useInitiateCheckout(mockAddressValues, 5.99))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Network error')
    expect(result.current.orderId).toBeNull()
    expect(result.current.clientSecret).toBeNull()
  })

  it('sets error when createPaymentIntent fails', async () => {
    vi.mocked(ordersApi.createOrder).mockResolvedValueOnce({
      id: 'order_abc',
      status: 'PENDING',
      total: 55.97,
    })
    vi.mocked(paymentsApi.createPaymentIntent).mockRejectedValueOnce(
      new Error('Payment init failed'),
    )

    const { result } = renderHook(() => useInitiateCheckout(mockAddressValues, 5.99))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error?.message).toBe('Payment init failed')
    expect(result.current.clientSecret).toBeNull()
  })
})

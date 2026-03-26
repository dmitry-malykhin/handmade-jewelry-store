import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSubmitCheckoutOrder } from '../use-submit-checkout-order'
import type { CheckoutAddressFormValues } from '../../checkout-address-schema'

const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockCreateOrder = vi.fn()
vi.mock('@/lib/api/orders', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}))

const mockCartItems = [
  {
    productId: 'prod-1',
    slug: 'silver-ring',
    title: 'Silver Ring',
    price: 49.99,
    image: '/images/ring.jpg',
    quantity: 1,
  },
]

vi.mock('@/store/cart.store', () => ({
  useCartItems: () => mockCartItems,
}))

const mockFormValues: CheckoutAddressFormValues = {
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
}

function createQueryClientWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return function QueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSubmitCheckoutOrder()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with isSubmitting false', () => {
    const { result } = renderHook(() => useSubmitCheckoutOrder(), {
      wrapper: createQueryClientWrapper(),
    })

    expect(result.current.isSubmitting).toBe(false)
  })

  it('calls createOrder with payload built from cart items and form values', async () => {
    mockCreateOrder.mockResolvedValue({ id: 'order-1', status: 'PENDING', total: 59.98 })

    const { result } = renderHook(() => useSubmitCheckoutOrder(), {
      wrapper: createQueryClientWrapper(),
    })

    act(() => {
      result.current.submitOrder(mockFormValues)
    })

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledOnce())

    const calledPayload = mockCreateOrder.mock.calls[0]?.[0]
    expect(calledPayload.items[0]?.productId).toBe('prod-1')
    expect(calledPayload.shippingAddress.fullName).toBe('Jane Doe')
    expect(calledPayload.shippingAddress).not.toHaveProperty('email')
  })

  it('navigates to the confirmation page on success', async () => {
    mockCreateOrder.mockResolvedValue({ id: 'order-42', status: 'PENDING', total: 59.98 })

    const { result } = renderHook(() => useSubmitCheckoutOrder(), {
      wrapper: createQueryClientWrapper(),
    })

    act(() => {
      result.current.submitOrder(mockFormValues)
    })

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/checkout/confirmation/order-42'),
    )
  })

  it('exposes submitError when createOrder rejects', async () => {
    mockCreateOrder.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSubmitCheckoutOrder(), {
      wrapper: createQueryClientWrapper(),
    })

    act(() => {
      result.current.submitOrder(mockFormValues)
    })

    await waitFor(() => expect(result.current.submitError).toBeInstanceOf(Error))
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})

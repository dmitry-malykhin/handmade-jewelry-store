import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/test-utils'
import { AdminOrderDetail } from '../admin-order-detail'
import * as ordersApi from '@/lib/api/orders'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'

vi.mock('@/lib/api/orders', () => ({
  fetchAdminOrderById: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
  updateAdminOrderTracking: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: 'mock-access-token' }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockFetchAdminOrderById = vi.mocked(ordersApi.fetchAdminOrderById)
const mockUpdateAdminOrderStatus = vi.mocked(ordersApi.updateAdminOrderStatus)
const mockUpdateAdminOrderTracking = vi.mocked(ordersApi.updateAdminOrderTracking)

const mockOrder: AdminOrderDetailType = {
  id: 'clorder1234567890',
  status: 'PAID',
  subtotal: 68.0,
  shippingCost: 5.0,
  total: 73.0,
  guestEmail: 'buyer@example.com',
  shippingAddress: {
    fullName: 'Jane Smith',
    addressLine1: '123 Main St',
    city: 'Portland',
    state: 'OR',
    postalCode: '97201',
    country: 'US',
    phone: '+1 503 555 0100',
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 2,
      price: 34.0,
      productSnapshot: {
        title: 'Silver Moon Ring',
        slug: 'silver-moon-ring',
        sku: 'SMR-001',
        image: 'https://cdn.example.com/products/ring.jpg',
      },
    },
  ],
  shippingCarrier: null,
  trackingNumber: null,
  shippedAt: null,
  estimatedDeliveryAt: null,
  deliveredAt: null,
  cancelReason: null,
  cancelNote: null,
  refundedAt: null,
  refundAmount: null,
  source: 'web',
  payment: {
    id: 'pay-1',
    status: 'SUCCEEDED',
    amount: 7300,
    currency: 'USD',
    stripePaymentIntentId: 'pi_mock_123',
  },
  statusHistory: [
    {
      id: 'hist-1',
      fromStatus: null,
      toStatus: 'PENDING',
      note: null,
      createdBy: 'guest',
      createdAt: '2026-04-01T10:00:00Z',
    },
    {
      id: 'hist-2',
      fromStatus: 'PENDING',
      toStatus: 'PAID',
      note: 'Stripe webhook',
      createdBy: 'system',
      createdAt: '2026-04-01T10:01:00Z',
    },
  ],
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:01:00Z',
}

// Radix UI requires these for pointer capture in jsdom
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

describe('AdminOrderDetail — rendering', () => {
  beforeEach(() => {
    mockFetchAdminOrderById.mockResolvedValue(mockOrder)
  })

  it('renders loading state before data arrives', () => {
    mockFetchAdminOrderById.mockImplementation(() => new Promise(() => {}))
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading order...')
  })

  it('renders order title with short id after data loads', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByText(/Order #34567890/)).toBeInTheDocument()
  })

  it('renders customer email', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByText('buyer@example.com')).toBeInTheDocument()
  })

  it('renders shipping address fields', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText(/Portland/)).toBeInTheDocument()
  })

  it('renders line item with correct product name and quantity', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByText('Silver Moon Ring')).toBeInTheDocument()
    expect(screen.getByText('SMR-001')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders total amount', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByText('$73.00', { exact: false })).toBeInTheDocument()
  })

  it('renders status history timeline entries', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    // Both history entries should be rendered as badges in the timeline
    const paidBadges = await screen.findAllByText('Paid')
    expect(paidBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders back link to orders list', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    const backLink = await screen.findByRole('link', { name: /back to orders list/i })
    expect(backLink).toHaveAttribute('href', '/admin/orders')
  })

  it('shows not found state when order query returns undefined', async () => {
    mockFetchAdminOrderById.mockRejectedValue(new Error('Not found'))
    render(<AdminOrderDetail orderId="nonexistent" />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('AdminOrderDetail — status update', () => {
  beforeEach(() => {
    mockFetchAdminOrderById.mockResolvedValue(mockOrder)
  })

  it('renders allowed next status buttons for PAID order', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    // PAID → PROCESSING, CANCELLED — button text is "Set to {status}"
    expect(await screen.findByRole('button', { name: /set to processing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set to cancelled/i })).toBeInTheDocument()
  })

  it('calls updateAdminOrderStatus when status button is clicked', async () => {
    const user = userEvent.setup()
    const updatedOrder = { ...mockOrder, status: 'PROCESSING' as const }
    mockUpdateAdminOrderStatus.mockResolvedValue(updatedOrder)

    render(<AdminOrderDetail orderId="clorder1234567890" />)
    const processingButton = await screen.findByRole('button', { name: /set to processing/i })
    await user.click(processingButton)

    expect(mockUpdateAdminOrderStatus).toHaveBeenCalledWith(
      'clorder1234567890',
      { status: 'PROCESSING' },
      'mock-access-token',
    )
  })

  it('shows final status message for REFUNDED order', async () => {
    mockFetchAdminOrderById.mockResolvedValue({ ...mockOrder, status: 'REFUNDED' })
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(
      await screen.findByText('This status is final. No further transitions available.'),
    ).toBeInTheDocument()
  })
})

describe('AdminOrderDetail — tracking', () => {
  beforeEach(() => {
    mockFetchAdminOrderById.mockResolvedValue(mockOrder)
  })

  it('renders tracking form with carrier select and tracking number input', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    expect(await screen.findByLabelText('Tracking number')).toBeInTheDocument()
    expect(screen.getByLabelText('Carrier')).toBeInTheDocument()
  })

  it('submit button is disabled when tracking number is empty', async () => {
    render(<AdminOrderDetail orderId="clorder1234567890" />)
    await screen.findByLabelText('Tracking number') // wait for data
    const saveButton = screen.getByRole('button', { name: 'Save tracking' })
    expect(saveButton).toBeDisabled()
  })

  it('calls updateAdminOrderTracking with tracking number and carrier on submit', async () => {
    const user = userEvent.setup()
    const updatedOrder = {
      ...mockOrder,
      trackingNumber: '9400111899223481750000',
      shippingCarrier: 'USPS',
    }
    mockUpdateAdminOrderTracking.mockResolvedValue(updatedOrder)

    render(<AdminOrderDetail orderId="clorder1234567890" />)
    await screen.findByLabelText('Tracking number')

    // Select carrier via Radix Select
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'USPS' }))

    await user.type(screen.getByLabelText('Tracking number'), '9400111899223481750000')
    await user.click(screen.getByRole('button', { name: 'Save tracking' }))

    await waitFor(() => {
      expect(mockUpdateAdminOrderTracking).toHaveBeenCalledWith(
        'clorder1234567890',
        { trackingNumber: '9400111899223481750000', shippingCarrier: 'USPS' },
        'mock-access-token',
      )
    })
  })
})

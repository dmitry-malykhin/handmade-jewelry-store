import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/test-utils'
import { LabelPurchaseSection } from '../label-purchase-section'
import * as adminShipping from '@/lib/api/admin-shipping'
import type { AdminOrderDetail } from '@/lib/api/orders'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/api/admin-shipping', () => ({
  fetchShippingStatus: vi.fn(),
  purchaseAdminShippingLabel: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: 'mock-token' }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Radix Select uses these in jsdom
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const baseOrder: AdminOrderDetail = {
  id: 'order-abc',
  status: 'PAID',
  subtotal: 50,
  shippingCost: 5,
  total: 55,
  guestEmail: 'buyer@example.com',
  shippingAddress: {
    fullName: 'Jane Smith',
    addressLine1: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97401',
    country: 'US',
  },
  items: [],
  shippingCarrier: null,
  trackingNumber: null,
  shippedAt: null,
  estimatedDeliveryAt: null,
  deliveredAt: null,
  cancelReason: null,
  cancelNote: null,
  refundedAt: null,
  refundAmount: null,
  refundReason: null,
  refundNote: null,
  productionStatus: 'QUEUED',
  productionNotes: null,
  source: 'web',
  payment: null,
  statusHistory: [],
  easypostShipmentId: null,
  easypostTrackerId: null,
  labelUrl: null,
  shippingInsuranceCents: 0,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
} as unknown as AdminOrderDetail

const mockFetchShippingStatus = vi.mocked(adminShipping.fetchShippingStatus)
const mockPurchaseLabel = vi.mocked(adminShipping.purchaseAdminShippingLabel)

beforeEach(() => {
  vi.clearAllMocks()
  // Default to live mode so the existing purchase-flow tests aren't gated by
  // the dry-run guard. Tests that exercise the guard override this.
  mockFetchShippingStatus.mockResolvedValue({ isLiveMode: true })
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('label-purchase-section')
  await $allureSeverity('normal')
})

describe('LabelPurchaseSection — render gating', () => {
  it('renders nothing when order is PENDING (not yet payable for label)', () => {
    const { container } = render(
      <LabelPurchaseSection order={{ ...baseOrder, status: 'PENDING' }} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the purchase form for a PAID order', async () => {
    render(<LabelPurchaseSection order={baseOrder} />)
    expect(await screen.findByRole('button', { name: 'Purchase label' })).toBeInTheDocument()
  })

  it('renders the dry-run badge when the API reports non-live mode', async () => {
    mockFetchShippingStatus.mockResolvedValue({ isLiveMode: false })
    render(<LabelPurchaseSection order={baseOrder} />)
    expect(await screen.findByText('Dry run')).toBeInTheDocument()
  })

  it('renders the live badge when the API reports live mode', async () => {
    render(<LabelPurchaseSection order={baseOrder} />)
    expect(await screen.findByText('Live')).toBeInTheDocument()
  })
})

describe('LabelPurchaseSection — dry-run purchase block', () => {
  it('disables the Purchase button and shows the warning banner in dry-run mode', async () => {
    mockFetchShippingStatus.mockResolvedValue({ isLiveMode: false })

    render(<LabelPurchaseSection order={baseOrder} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/EasyPost is in dry-run mode/i)
    expect(screen.getByRole('button', { name: 'Purchase label' })).toBeDisabled()
  })

  it('does NOT call the purchase API when clicked in dry-run mode', async () => {
    mockFetchShippingStatus.mockResolvedValue({ isLiveMode: false })
    const user = userEvent.setup()

    render(<LabelPurchaseSection order={baseOrder} />)

    await screen.findByRole('alert')
    const button = screen.getByRole('button', { name: 'Purchase label' })
    await user.click(button)

    expect(mockPurchaseLabel).not.toHaveBeenCalled()
  })

  it('enables the Purchase button and hides the warning banner in live mode', async () => {
    render(<LabelPurchaseSection order={baseOrder} />)

    await screen.findByText('Live')
    const button = screen.getByRole('button', { name: 'Purchase label' })
    expect(button).not.toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('LabelPurchaseSection — insurance offer', () => {
  it('hides the insurance toggle for orders under $100', async () => {
    render(<LabelPurchaseSection order={baseOrder} />)
    await screen.findByRole('button', { name: 'Purchase label' })
    expect(screen.queryByText(/Add insurance for/)).not.toBeInTheDocument()
  })

  it('shows the insurance toggle for orders at or above $100', async () => {
    const highValueOrder = { ...baseOrder, total: 250 }
    render(<LabelPurchaseSection order={highValueOrder} />)
    expect(await screen.findByText('Add insurance for $250.00')).toBeInTheDocument()
  })
})

describe('LabelPurchaseSection — purchase flow', () => {
  it('calls purchase API with selected carrier and zero insurance by default', async () => {
    const user = userEvent.setup()
    mockPurchaseLabel.mockResolvedValue({
      shipmentId: 'shp_x',
      trackerId: 'trk_x',
      trackingNumber: 'TRK_X',
      labelUrl: 'https://example.test/label.pdf',
      carrier: 'USPS',
      estimatedDeliveryAt: null,
      insuranceCents: 0,
      isLiveMode: false,
    })

    render(<LabelPurchaseSection order={baseOrder} />)

    await user.click(await screen.findByRole('button', { name: 'Purchase label' }))

    await waitFor(() => {
      expect(mockPurchaseLabel).toHaveBeenCalledWith(
        'order-abc',
        { carrier: 'USPS', insuranceCents: 0 },
        'mock-token',
      )
    })
  })

  it('sends the order total as insurance when the toggle is on', async () => {
    const user = userEvent.setup()
    const highValueOrder = { ...baseOrder, total: 250 }
    mockPurchaseLabel.mockResolvedValue({
      shipmentId: 'shp_x',
      trackerId: 'trk_x',
      trackingNumber: 'TRK_X',
      labelUrl: 'https://example.test/label.pdf',
      carrier: 'USPS',
      estimatedDeliveryAt: null,
      insuranceCents: 25000,
      isLiveMode: false,
    })

    render(<LabelPurchaseSection order={highValueOrder} />)

    const insuranceSwitch = await screen.findByRole('switch')
    await user.click(insuranceSwitch)

    await user.click(screen.getByRole('button', { name: 'Purchase label' }))

    await waitFor(() => {
      expect(mockPurchaseLabel).toHaveBeenCalledWith(
        'order-abc',
        { carrier: 'USPS', insuranceCents: 25000 },
        'mock-token',
      )
    })
  })
})

describe('LabelPurchaseSection — post-purchase view', () => {
  it('shows the label download link instead of the purchase form when labelUrl is set', () => {
    const purchasedOrder = {
      ...baseOrder,
      labelUrl: 'https://example.test/already.pdf',
      shippingInsuranceCents: 5000,
    }

    render(<LabelPurchaseSection order={purchasedOrder} />)

    const link = screen.getByRole('link', { name: /Download label PDF/ })
    expect(link).toHaveAttribute('href', 'https://example.test/already.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Insured for $50.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Purchase label' })).not.toBeInTheDocument()
  })
})

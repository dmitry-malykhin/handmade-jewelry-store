import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import type { AdminOrderDetail } from '@/lib/api/orders'
import { TrackingSection } from '../tracking-section'

function buildOrder(overrides: Partial<AdminOrderDetail> = {}): AdminOrderDetail {
  return {
    id: 'order-1',
    status: 'SHIPPED',
    subtotal: 100,
    shippingCost: 5,
    total: 105,
    guestEmail: null,
    shippingAddress: {
      fullName: '',
      addressLine1: '',
      city: '',
      postalCode: '',
      country: '',
    },
    items: [],
    createdAt: '',
    updatedAt: '',
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
    source: null,
    statusHistory: [],
    payment: null,
    easypostShipmentId: null,
    easypostTrackerId: null,
    labelUrl: null,
    shippingInsuranceCents: 0,
    discountCode: null,
    discountAmountCents: null,
    discountType: null,
    ...overrides,
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  if (!process.env.CI) return
  await $allureSuite('web/admin/orders')
  await $allureSubSuite('tracking-section')
  await $allureSeverity('normal')
})

describe('TrackingSection', () => {
  it('shows existing tracking number + carrier when order already has them', () => {
    render(
      <TrackingSection
        order={buildOrder({ trackingNumber: 'TRK-100', shippingCarrier: 'USPS' })}
        onTrackingSubmit={vi.fn()}
        isUpdating={false}
      />,
    )

    expect(screen.getByText('TRK-100')).toBeInTheDocument()
    // The existing carrier appears twice — once in the header display, once as Select value.
    expect(screen.getAllByText('USPS').length).toBeGreaterThanOrEqual(1)
  })

  it('disables Save until both trackingNumber and carrier are provided', async () => {
    render(<TrackingSection order={buildOrder()} onTrackingSubmit={vi.fn()} isUpdating={false} />)

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('submits trimmed trackingNumber + carrier via onTrackingSubmit', async () => {
    const onTrackingSubmit = vi.fn()
    render(
      <TrackingSection
        order={buildOrder({ shippingCarrier: 'USPS' })}
        onTrackingSubmit={onTrackingSubmit}
        isUpdating={false}
      />,
    )

    const trackingInput = screen.getByLabelText(/tracking number/i)
    await userEvent.type(trackingInput, '  TRK-999  ')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(onTrackingSubmit).toHaveBeenCalledWith({
        trackingNumber: 'TRK-999',
        shippingCarrier: 'USPS',
      }),
    )
  })

  it('shows "Saving…" label and disables Save while isUpdating=true', () => {
    render(
      <TrackingSection
        order={buildOrder({ trackingNumber: 'TRK', shippingCarrier: 'USPS' })}
        onTrackingSubmit={vi.fn()}
        isUpdating={true}
      />,
    )

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})

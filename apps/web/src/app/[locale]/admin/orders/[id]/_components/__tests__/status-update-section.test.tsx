import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import type { AdminOrderDetail } from '@/lib/api/orders'
import { StatusUpdateSection } from '../status-update-section'

function buildOrder(status: AdminOrderDetail['status']): AdminOrderDetail {
  return {
    id: 'order-1',
    status,
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
  }
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/admin/orders')
  await $allureSubSuite('status-update-section')
  await $allureSeverity('normal')
})

describe('StatusUpdateSection', () => {
  it('renders one button per allowed next status from PAID (→ PROCESSING, → CANCELLED)', () => {
    render(
      <StatusUpdateSection
        order={buildOrder('PAID')}
        onStatusChange={vi.fn()}
        isUpdating={false}
      />,
    )

    expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelled/i })).toBeInTheDocument()
  })

  it('shows the "final state" message and NO buttons when status is REFUNDED', () => {
    render(
      <StatusUpdateSection
        order={buildOrder('REFUNDED')}
        onStatusChange={vi.fn()}
        isUpdating={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /change to/i })).not.toBeInTheDocument()
    expect(screen.getByText(/final/i)).toBeInTheDocument()
  })

  it('disables all transition buttons while isUpdating=true', () => {
    render(
      <StatusUpdateSection order={buildOrder('PAID')} onStatusChange={vi.fn()} isUpdating={true} />,
    )

    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled())
  })

  it('invokes onStatusChange(nextStatus) when a transition button is clicked', async () => {
    const onStatusChange = vi.fn()
    render(
      <StatusUpdateSection
        order={buildOrder('SHIPPED')}
        onStatusChange={onStatusChange}
        isUpdating={false}
      />,
    )

    // SHIPPED → DELIVERED (only allowed transition from SHIPPED)
    await userEvent.click(screen.getByRole('button', { name: /delivered/i }))

    expect(onStatusChange).toHaveBeenCalledWith('DELIVERED')
  })
})

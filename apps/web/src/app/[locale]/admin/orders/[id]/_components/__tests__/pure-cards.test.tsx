import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import type { AdminOrderDetail } from '@/lib/api/orders'
import { CustomerInfoCard } from '../customer-info-card'
import { LineItemsTable } from '../line-items-table'
import { OrderSummaryCard } from '../order-summary-card'
import { ShippingAddressCard } from '../shipping-address-card'
import { StatusTimeline } from '../status-timeline'

function buildOrder(overrides: Partial<AdminOrderDetail> = {}): AdminOrderDetail {
  return {
    id: 'order-abcdefgh12345678',
    status: 'PAID',
    subtotal: 100,
    shippingCost: 5,
    total: 105,
    guestEmail: 'jane@example.com',
    shippingAddress: {
      fullName: 'Jane Doe',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      phone: '+15550001',
    },
    items: [
      {
        id: 'item-1',
        productId: 'p1',
        quantity: 2,
        price: 49.99,
        productSnapshot: { title: 'Silver Ring', slug: 'silver-ring', sku: 'SKU-100' },
      },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
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
    statusHistory: [
      {
        id: 'h1',
        fromStatus: null,
        toStatus: 'PENDING',
        note: null,
        createdBy: 'guest',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'h2',
        fromStatus: 'PENDING',
        toStatus: 'PAID',
        note: 'Stripe webhook',
        createdBy: 'system',
        createdAt: '2026-06-01T00:05:00.000Z',
      },
    ],
    payment: {
      id: 'pay-1',
      status: 'SUCCEEDED',
      amount: 105,
      currency: 'usd',
      stripePaymentIntentId: 'pi_test',
    },
    easypostShipmentId: null,
    easypostTrackerId: null,
    labelUrl: null,
    shippingInsuranceCents: 0,
    ...overrides,
  }
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/admin/orders')
  await $allureSubSuite('pure-cards')
  await $allureSeverity('normal')
})

describe('OrderSummaryCard', () => {
  it('renders order id (last 8), subtotal, shipping, total in USD with 2 decimals', () => {
    render(<OrderSummaryCard order={buildOrder()} />)
    expect(screen.getByText(/12345678/)).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$5.00')).toBeInTheDocument()
    expect(screen.getByText('$105.00')).toBeInTheDocument()
  })

  it('renders payment badge when payment exists', () => {
    render(<OrderSummaryCard order={buildOrder()} />)
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument()
  })

  it('renders — em-dash when payment is null', () => {
    render(<OrderSummaryCard order={buildOrder({ payment: null })} />)
    // dt (payment label) + dd (—). At least one em-dash should be present.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('CustomerInfoCard', () => {
  it('renders guestEmail when present', () => {
    render(<CustomerInfoCard order={buildOrder({ guestEmail: 'jane@example.com' })} />)
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('falls back to Guest label when guestEmail is null', () => {
    render(<CustomerInfoCard order={buildOrder({ guestEmail: null })} />)
    expect(screen.getByText(/guest/i)).toBeInTheDocument()
  })
})

describe('ShippingAddressCard', () => {
  it('renders address inside <address> element with all lines', () => {
    const { container } = render(<ShippingAddressCard order={buildOrder()} />)
    expect(container.querySelector('address')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText('Apt 4')).toBeInTheDocument()
    expect(screen.getByText(/New York, NY 10001/)).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
    expect(screen.getByText('+15550001')).toBeInTheDocument()
  })

  it('omits addressLine2 and phone when absent', () => {
    render(
      <ShippingAddressCard
        order={buildOrder({
          shippingAddress: {
            fullName: 'Jane',
            addressLine1: '1 Main',
            city: 'NY',
            postalCode: '10001',
            country: 'US',
          },
        })}
      />,
    )
    expect(screen.queryByText('Apt 4')).not.toBeInTheDocument()
    expect(screen.queryByText('+15550001')).not.toBeInTheDocument()
  })
})

describe('LineItemsTable', () => {
  it('renders each item with product title + quantity + unit price + line total', () => {
    render(<LineItemsTable order={buildOrder()} />)
    expect(screen.getByText('Silver Ring')).toBeInTheDocument()
    expect(screen.getByText('SKU-100')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('$49.99')).toBeInTheDocument()
    // 2 × 49.99 = 99.98 line total
    expect(screen.getByText('$99.98')).toBeInTheDocument()
  })

  it('shows em-dash when SKU is null', () => {
    render(
      <LineItemsTable
        order={buildOrder({
          items: [
            {
              id: 'i2',
              productId: 'p2',
              quantity: 1,
              price: 10,
              productSnapshot: { title: 'Bracelet', slug: 'bracelet' },
            },
          ],
        })}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('StatusTimeline', () => {
  it('renders one <li> per statusHistory entry with a <time> datetime', () => {
    const { container } = render(<StatusTimeline order={buildOrder()} />)
    expect(container.querySelectorAll('li').length).toBe(2)
    const times = container.querySelectorAll('time')
    expect(times.length).toBe(2)
    expect(times[0]).toHaveAttribute('datetime', '2026-06-01T00:00:00.000Z')
  })

  it('renders the note under each entry when present', () => {
    render(<StatusTimeline order={buildOrder()} />)
    expect(screen.getByText('Stripe webhook')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import enMessages from '../../../../../../../../messages/en.json'

const mockFetchOrderById = vi.fn()
vi.mock('@/lib/api/orders', () => ({
  fetchOrderById: (...args: unknown[]) => mockFetchOrderById(...args),
}))

const mockNotFound = vi.fn()
vi.mock('next/navigation', () => ({ notFound: () => mockNotFound() }))

// Sub-components pull providers unrelated to this test's contract.
vi.mock('../order-placed-tracker', () => ({ OrderPlacedTracker: () => null }))
vi.mock('../express-checkout-cleanup', () => ({ ExpressCheckoutCleanup: () => null }))
vi.mock('../confirmation-success-header', () => ({
  ConfirmationSuccessHeader: ({ orderId }: { orderId: string }) => <p>{`id=${orderId}`}</p>,
}))
vi.mock('../confirmation-next-steps', () => ({ ConfirmationNextSteps: () => null }))
vi.mock('../confirmation-order-items', () => ({ ConfirmationOrderItems: () => null }))
vi.mock('../confirmation-order-summary', () => ({ ConfirmationOrderSummary: () => null }))

import { ConfirmationBodyClient } from '../confirmation-body-client'

function renderBody(props: { orderId: string; urlToken: string | null }) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ConfirmationBodyClient {...props} />
    </NextIntlClientProvider>,
  )
}

const BASE_ORDER = {
  id: 'order_abc',
  status: 'PAID',
  total: 49.99,
  subtotal: 44,
  shippingCost: 5.99,
  guestEmail: 'jane@example.com',
  items: [
    {
      productId: 'p1',
      quantity: 1,
      price: 44,
      productSnapshot: { title: 'Silver Ring', imageUrl: null, slug: 'silver-ring' },
    },
  ],
  shippingAddress: null,
  createdAt: '2026-11-04T10:00:00Z',
  updatedAt: '2026-11-04T10:00:00Z',
}

beforeEach(async () => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  if (!process.env.CI) return
  await $allureSuite('web/app/locale/checkout/confirmation')
  await $allureSubSuite('confirmation-body-client')
  await $allureSeverity('critical')
})

describe('ConfirmationBodyClient (#588)', () => {
  it('reads the token from sessionStorage, deletes it after consumption, and calls fetchOrderById with it', async () => {
    window.sessionStorage.setItem('orderAccessToken:order_abc', 'session-token-1')
    mockFetchOrderById.mockResolvedValueOnce(BASE_ORDER)

    renderBody({ orderId: 'order_abc', urlToken: null })

    await waitFor(() =>
      expect(mockFetchOrderById).toHaveBeenCalledWith('order_abc', {
        orderAccessToken: 'session-token-1',
      }),
    )
    expect(window.sessionStorage.getItem('orderAccessToken:order_abc')).toBeNull()
    expect(await screen.findByText('id=order_abc')).toBeInTheDocument()
  })

  it('falls back to the URL token when sessionStorage is empty (email-link flow)', async () => {
    mockFetchOrderById.mockResolvedValueOnce(BASE_ORDER)

    renderBody({ orderId: 'order_abc', urlToken: 'legacy-url-token' })

    await waitFor(() =>
      expect(mockFetchOrderById).toHaveBeenCalledWith('order_abc', {
        orderAccessToken: 'legacy-url-token',
      }),
    )
  })

  it('prefers sessionStorage over the URL token when both are present', async () => {
    window.sessionStorage.setItem('orderAccessToken:order_abc', 'session-wins')
    mockFetchOrderById.mockResolvedValueOnce(BASE_ORDER)

    renderBody({ orderId: 'order_abc', urlToken: 'url-loses' })

    await waitFor(() =>
      expect(mockFetchOrderById).toHaveBeenCalledWith('order_abc', {
        orderAccessToken: 'session-wins',
      }),
    )
  })

  it('surfaces notFound() when the API rejects (404 / expired token)', async () => {
    mockFetchOrderById.mockRejectedValueOnce(new Error('404'))

    renderBody({ orderId: 'ghost-order', urlToken: null })

    await waitFor(() => expect(mockNotFound).toHaveBeenCalled())
  })
})

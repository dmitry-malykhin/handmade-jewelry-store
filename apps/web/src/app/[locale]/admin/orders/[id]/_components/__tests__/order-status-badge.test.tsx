import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { OrderStatusBadge } from '../order-status-badge'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/admin/orders')
  await $allureSubSuite('order-status-badge')
  await $allureSeverity('normal')
})

describe('OrderStatusBadge', () => {
  it('renders translated status text for PAID', () => {
    render(<OrderStatusBadge status="PAID" />)
    expect(screen.getByText(/paid/i)).toBeInTheDocument()
  })

  it('renders translated status text for REFUNDED', () => {
    render(<OrderStatusBadge status="REFUNDED" />)
    expect(screen.getByText(/refunded/i)).toBeInTheDocument()
  })

  it('renders text content for every OrderStatus value (no missing translation)', () => {
    const allStatuses = [
      'PENDING',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ] as const

    allStatuses.forEach((status) => {
      const { unmount } = render(<OrderStatusBadge status={status} />)
      const badge = screen.getByText(/./)
      expect(badge.textContent?.length).toBeGreaterThan(0)
      unmount()
    })
  })
})

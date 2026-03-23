import { OrderStatus } from '@prisma/client'
import {
  ALLOWED_ORDER_STATUS_TRANSITIONS,
  isValidOrderStatusTransition,
} from './order-status.transitions'

describe('isValidOrderStatusTransition', () => {
  describe('allowed transitions (happy path)', () => {
    it('allows PENDING → PAID when Stripe webhook confirms payment', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(true)
    })

    it('allows PENDING → CANCELLED when payment fails or times out', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true)
    })

    it('allows PAID → PROCESSING when admin starts packing or production', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING)).toBe(true)
    })

    it('allows PAID → CANCELLED when customer cancels before production starts', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true)
    })

    it('allows PROCESSING → SHIPPED when admin adds tracking number', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true)
    })

    it('allows PROCESSING → CANCELLED for MADE_TO_ORDER before production completes', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)).toBe(true)
    })

    it('allows SHIPPED → DELIVERED when customer confirms receipt or 14 days elapse', () => {
      expect(isValidOrderStatusTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true)
    })

    it('allows DELIVERED → REFUNDED for return within 30-day window', () => {
      expect(isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.REFUNDED)).toBe(true)
    })

    it('allows DELIVERED → PARTIALLY_REFUNDED when partial return is approved', () => {
      expect(
        isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.PARTIALLY_REFUNDED),
      ).toBe(true)
    })

    it('allows CANCELLED → REFUNDED after Stripe refund executes', () => {
      expect(isValidOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.REFUNDED)).toBe(true)
    })

    it('allows CANCELLED → PARTIALLY_REFUNDED for MADE_TO_ORDER cancelled mid-production', () => {
      expect(
        isValidOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.PARTIALLY_REFUNDED),
      ).toBe(true)
    })
  })

  describe('forbidden transitions (backward movements)', () => {
    it('forbids PAID → PENDING (cannot revert confirmed payment)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.PENDING)).toBe(false)
    })

    it('forbids SHIPPED → PAID (cannot revert after shipping)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.SHIPPED, OrderStatus.PAID)).toBe(false)
    })

    it('forbids DELIVERED → SHIPPED (cannot revert delivery confirmation)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toBe(false)
    })

    it('forbids REFUNDED → CANCELLED (terminal state — no transitions allowed)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.REFUNDED, OrderStatus.CANCELLED)).toBe(false)
    })
  })

  describe('forbidden transitions (status skips)', () => {
    it('forbids PENDING → SHIPPED (must go through PAID and PROCESSING first)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false)
    })

    it('forbids PENDING → DELIVERED (cannot skip entire fulfilment pipeline)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false)
    })

    it('forbids PAID → SHIPPED (must go through PROCESSING first)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(false)
    })

    it('forbids PENDING → REFUNDED (no payment was made to refund)', () => {
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.REFUNDED)).toBe(false)
    })
  })

  describe('terminal state', () => {
    it('allows no transitions out of REFUNDED', () => {
      const refundedTransitions = ALLOWED_ORDER_STATUS_TRANSITIONS[OrderStatus.REFUNDED]
      expect(refundedTransitions).toHaveLength(0)
    })

    it('returns false for every possible target status from REFUNDED', () => {
      const allStatuses = Object.values(OrderStatus)
      allStatuses.forEach((targetStatus) => {
        expect(isValidOrderStatusTransition(OrderStatus.REFUNDED, targetStatus)).toBe(false)
      })
    })

    it('allows no transitions out of PARTIALLY_REFUNDED', () => {
      const partiallyRefundedTransitions =
        ALLOWED_ORDER_STATUS_TRANSITIONS[OrderStatus.PARTIALLY_REFUNDED]
      expect(partiallyRefundedTransitions).toHaveLength(0)
    })

    it('returns false for every possible target status from PARTIALLY_REFUNDED', () => {
      const allStatuses = Object.values(OrderStatus)
      allStatuses.forEach((targetStatus) => {
        expect(isValidOrderStatusTransition(OrderStatus.PARTIALLY_REFUNDED, targetStatus)).toBe(
          false,
        )
      })
    })
  })

  describe('transition map completeness', () => {
    it('has an entry for every OrderStatus value', () => {
      const allStatuses = Object.values(OrderStatus)
      allStatuses.forEach((orderStatus) => {
        expect(ALLOWED_ORDER_STATUS_TRANSITIONS).toHaveProperty(orderStatus)
      })
    })
  })
})

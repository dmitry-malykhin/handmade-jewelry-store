import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type Stripe from 'stripe'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeWebhooksService } from './stripe-webhooks.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORDER_ID = 'order_test_123'
const PAYMENT_ID = 'payment_test_abc'
const STRIPE_INTENT_ID = 'pi_test_abc'
const STRIPE_CHARGE_ID = 'ch_test_xyz'

const buildMockPayment = (overrides: Record<string, unknown> = {}) => ({
  id: PAYMENT_ID,
  orderId: ORDER_ID,
  stripeId: STRIPE_INTENT_ID,
  status: PaymentStatus.PENDING,
  amount: new Decimal('49.98'),
  order: {
    id: ORDER_ID,
    status: OrderStatus.PENDING,
    guestEmail: 'guest@example.com',
  },
  ...overrides,
})

const buildMockFullOrder = () => ({
  id: ORDER_ID,
  guestEmail: 'guest@example.com',
  subtotal: new Decimal('99.98'),
  shippingCost: new Decimal('5.00'),
  total: new Decimal('104.98'),
  shippingAddress: {
    fullName: 'Jane Doe',
    addressLine1: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'US',
  },
  items: [
    {
      id: 'item-1',
      quantity: 2,
      price: new Decimal('49.99'),
      productSnapshot: { title: 'Silver Ring' },
    },
  ],
})

const buildMockPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}) =>
  ({ id: STRIPE_INTENT_ID, ...overrides }) as Stripe.PaymentIntent

const buildMockCharge = (overrides: Partial<Stripe.Charge> = {}) =>
  ({
    id: STRIPE_CHARGE_ID,
    payment_intent: STRIPE_INTENT_ID,
    // amount and amount_refunded equal → full refund (default case)
    amount: 4998,
    amount_refunded: 4998,
    ...overrides,
  }) as unknown as Stripe.Charge

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/stripe')
  await $allureSubSuite('stripe-webhooks.service')
  await $allureSeverity('normal')
})

describe('StripeWebhooksService', () => {
  let stripeWebhooksService: StripeWebhooksService
  let mockPrismaService: {
    payment: { findUnique: jest.Mock; update: jest.Mock }
    order: { findUnique: jest.Mock; update: jest.Mock }
    $transaction: jest.Mock
  }
  let mockEmailService: { sendOrderConfirmation: jest.Mock; sendRefundProcessed: jest.Mock }
  let mockAnalyticsService: {
    trackPaymentSucceeded: jest.Mock
    trackOrderCreated: jest.Mock
  }

  beforeEach(async () => {
    mockPrismaService = {
      payment: { findUnique: jest.fn(), update: jest.fn() },
      order: { findUnique: jest.fn(), update: jest.fn() },
      // Execute the callback directly so we can assert individual prisma calls
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    }
    mockEmailService = {
      sendOrderConfirmation: jest.fn(),
      sendRefundProcessed: jest.fn(),
    }
    mockAnalyticsService = {
      trackPaymentSucceeded: jest.fn(),
      trackOrderCreated: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile()

    stripeWebhooksService = module.get<StripeWebhooksService>(StripeWebhooksService)
  })

  describe('handlePaymentIntentSucceeded', () => {
    it('updates payment to SUCCEEDED and order to PAID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(buildMockPayment())

      await stripeWebhooksService.handlePaymentIntentSucceeded(buildMockPaymentIntent())

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.SUCCEEDED } }),
      )
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.PAID }),
        }),
      )
    })

    it('skips processing when payment is already SUCCEEDED (idempotency)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ status: PaymentStatus.SUCCEEDED }),
      )

      await stripeWebhooksService.handlePaymentIntentSucceeded(buildMockPaymentIntent())

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('skips when no payment record found for PaymentIntent', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(null)

      await stripeWebhooksService.handlePaymentIntentSucceeded(buildMockPaymentIntent())

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('sends order confirmation email to guest after successful payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(buildMockPayment())
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildMockFullOrder())

      await stripeWebhooksService.handlePaymentIntentSucceeded(buildMockPaymentIntent())

      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'guest@example.com',
          orderId: ORDER_ID,
        }),
      )
    })

    // PostHog server-side capture — webhook is the trusted source of revenue
    // events. Client `order_placed` can be lost, so this server event is the
    // source of truth in funnel analysis.
    it('captures payment_succeeded with guest email as distinct_id for guest orders', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(buildMockPayment())

      await stripeWebhooksService.handlePaymentIntentSucceeded(
        buildMockPaymentIntent({
          amount: 14998,
          payment_method_types: ['card'],
        } as Partial<Stripe.PaymentIntent>),
      )

      expect(mockAnalyticsService.trackPaymentSucceeded).toHaveBeenCalledWith('guest@example.com', {
        orderId: ORDER_ID,
        amountUsd: 149.98,
        paymentMethod: 'card',
      })
    })

    it('captures payment_succeeded with userId as distinct_id for registered orders', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({
          order: {
            id: ORDER_ID,
            status: OrderStatus.PENDING,
            userId: 'user-42',
            guestEmail: null,
          },
        }),
      )

      await stripeWebhooksService.handlePaymentIntentSucceeded(
        buildMockPaymentIntent({
          amount: 4998,
          payment_method_types: ['klarna'],
        } as Partial<Stripe.PaymentIntent>),
      )

      expect(mockAnalyticsService.trackPaymentSucceeded).toHaveBeenCalledWith(
        'user-42',
        expect.objectContaining({
          orderId: ORDER_ID,
          amountUsd: 49.98,
          paymentMethod: 'klarna',
        }),
      )
    })

    it('does not capture payment_succeeded on idempotent re-delivery', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ status: PaymentStatus.SUCCEEDED }),
      )

      await stripeWebhooksService.handlePaymentIntentSucceeded(buildMockPaymentIntent())

      expect(mockAnalyticsService.trackPaymentSucceeded).not.toHaveBeenCalled()
    })
  })

  describe('handlePaymentIntentFailed', () => {
    it('updates payment to FAILED and order to CANCELLED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(buildMockPayment())

      await stripeWebhooksService.handlePaymentIntentFailed(buildMockPaymentIntent())

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.FAILED } }),
      )
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelReason: 'PAYMENT_FAILED',
          }),
        }),
      )
    })

    it('skips processing when payment is already FAILED (idempotency)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ status: PaymentStatus.FAILED }),
      )

      await stripeWebhooksService.handlePaymentIntentFailed(buildMockPaymentIntent())

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('handleChargeRefunded', () => {
    it('updates payment to REFUNDED and order to REFUNDED with refund amount', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ order: { id: ORDER_ID, status: OrderStatus.DELIVERED } }),
      )

      await stripeWebhooksService.handleChargeRefunded(buildMockCharge())

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.REFUNDED } }),
      )
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.REFUNDED,
            // amount_refunded 4998 cents → $49.98
            refundAmount: 49.98,
          }),
        }),
      )
    })

    it('skips when charge has no payment_intent', async () => {
      await stripeWebhooksService.handleChargeRefunded(buildMockCharge({ payment_intent: null }))

      expect(mockPrismaService.payment.findUnique).not.toHaveBeenCalled()
    })

    it('skips processing when payment is already REFUNDED (idempotency)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ status: PaymentStatus.REFUNDED }),
      )

      await stripeWebhooksService.handleChargeRefunded(buildMockCharge())

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('sends refund processed email to guest after charge is refunded', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({
          order: { id: ORDER_ID, status: OrderStatus.DELIVERED, guestEmail: 'guest@example.com' },
        }),
      )

      await stripeWebhooksService.handleChargeRefunded(buildMockCharge())

      expect(mockEmailService.sendRefundProcessed).toHaveBeenCalledWith({
        recipientEmail: 'guest@example.com',
        orderId: ORDER_ID,
        refundAmount: 49.98,
      })
    })

    // Partial refund detection: when charge.amount_refunded < charge.amount,
    // the order must transition to PARTIALLY_REFUNDED, not REFUNDED.
    it('sets PARTIALLY_REFUNDED when amount_refunded < charge.amount', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ order: { id: ORDER_ID, status: OrderStatus.DELIVERED } }),
      )

      await stripeWebhooksService.handleChargeRefunded(
        buildMockCharge({ amount: 4998, amount_refunded: 2000 } as Partial<Stripe.Charge>),
      )

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.PARTIALLY_REFUNDED } }),
      )
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.PARTIALLY_REFUNDED,
            refundAmount: 20,
          }),
        }),
      )
    })

    it('skips when payment already PARTIALLY_REFUNDED and webhook reports same partial', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        buildMockPayment({ status: PaymentStatus.PARTIALLY_REFUNDED }),
      )

      await stripeWebhooksService.handleChargeRefunded(
        buildMockCharge({ amount: 4998, amount_refunded: 2000 } as Partial<Stripe.Charge>),
      )

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('handleChargeDisputeCreated', () => {
    it('logs an error without throwing', () => {
      const mockDispute = {
        id: 'dp_test_123',
        charge: STRIPE_CHARGE_ID,
        amount: 4998,
      } as Stripe.Dispute

      expect(() => stripeWebhooksService.handleChargeDisputeCreated(mockDispute)).not.toThrow()
    })
  })
})

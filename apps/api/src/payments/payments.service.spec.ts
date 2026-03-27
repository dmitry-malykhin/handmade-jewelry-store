import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Decimal } from '@prisma/client/runtime/library'
import type Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { PaymentsService } from './payments.service'

const ORDER_ID = 'order_test_123'
const STRIPE_INTENT_ID = 'pi_test_abc'
const CLIENT_SECRET = 'pi_test_abc_secret_xyz'

const buildMockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  status: 'PENDING',
  total: new Decimal('49.98'),
  payment: null,
  ...overrides,
})

const buildMockPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}) =>
  ({
    id: STRIPE_INTENT_ID,
    client_secret: CLIENT_SECRET,
    ...overrides,
  }) as Stripe.PaymentIntent

describe('PaymentsService', () => {
  let paymentsService: PaymentsService
  let mockPrismaService: {
    order: { findUnique: jest.Mock }
    payment: { create: jest.Mock }
  }
  let mockStripeService: {
    client: {
      paymentIntents: {
        create: jest.Mock
        retrieve: jest.Mock
      }
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      order: { findUnique: jest.fn() },
      payment: { create: jest.fn() },
    }

    mockStripeService = {
      client: {
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile()

    paymentsService = module.get<PaymentsService>(PaymentsService)
  })

  describe('createPaymentIntent', () => {
    it('creates a Stripe PaymentIntent and saves a Payment record for a PENDING order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildMockOrder())
      mockStripeService.client.paymentIntents.create.mockResolvedValueOnce(buildMockPaymentIntent())
      mockPrismaService.payment.create.mockResolvedValueOnce({})

      const result = await paymentsService.createPaymentIntent(ORDER_ID)

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      // Amount in cents: $49.98 → 4998
      expect(mockStripeService.client.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4998, currency: 'usd', metadata: { orderId: ORDER_ID } }),
        { idempotencyKey: `create-intent-${ORDER_ID}` },
      )
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderId: ORDER_ID, stripeId: STRIPE_INTENT_ID }),
        }),
      )
    })

    it('returns existing clientSecret when a Payment record already exists', async () => {
      const orderWithPayment = buildMockOrder({ payment: { stripeId: STRIPE_INTENT_ID } })
      mockPrismaService.order.findUnique.mockResolvedValueOnce(orderWithPayment)
      mockStripeService.client.paymentIntents.retrieve.mockResolvedValueOnce(
        buildMockPaymentIntent(),
      )

      const result = await paymentsService.createPaymentIntent(ORDER_ID)

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      expect(mockStripeService.client.paymentIntents.create).not.toHaveBeenCalled()
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(null)

      await expect(paymentsService.createPaymentIntent(ORDER_ID)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when the order status is not PENDING', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildMockOrder({ status: 'PAID' }))

      await expect(paymentsService.createPaymentIntent(ORDER_ID)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('throws ConflictException when Stripe returns no client_secret', async () => {
      mockPrismaService.order.findUnique.mockResolvedValueOnce(buildMockOrder())
      mockStripeService.client.paymentIntents.create.mockResolvedValueOnce(
        buildMockPaymentIntent({ client_secret: null }),
      )

      await expect(paymentsService.createPaymentIntent(ORDER_ID)).rejects.toThrow(ConflictException)
    })
  })
})

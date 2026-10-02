import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Role, type User } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type Stripe from 'stripe'
import { OrdersQueryService } from '../orders/orders-query.service'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { PaymentsService } from './payments.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORDER_ID = 'order_test_123'
const STRIPE_INTENT_ID = 'pi_test_abc'
const CLIENT_SECRET = 'pi_test_abc_secret_xyz'

const buildMockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  status: 'PENDING',
  total: new Decimal('49.98'),
  userId: null,
  ...overrides,
})

const buildMockPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}) =>
  ({
    id: STRIPE_INTENT_ID,
    client_secret: CLIENT_SECRET,
    ...overrides,
  }) as Stripe.PaymentIntent

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/payments')
  await $allureSubSuite('payments.service')
  await $allureSeverity('critical')
})

describe('PaymentsService', () => {
  let paymentsService: PaymentsService
  let mockPrismaService: {
    payment: { create: jest.Mock; findUnique: jest.Mock }
  }
  let mockStripeService: {
    client: {
      paymentIntents: {
        create: jest.Mock
        retrieve: jest.Mock
      }
    }
  }
  let mockOrdersQueryService: {
    findOneByIdForCaller: jest.Mock
  }

  beforeEach(async () => {
    mockPrismaService = {
      payment: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
    }

    mockStripeService = {
      client: {
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
    }

    mockOrdersQueryService = {
      findOneByIdForCaller: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: OrdersQueryService, useValue: mockOrdersQueryService },
      ],
    }).compile()

    paymentsService = module.get<PaymentsService>(PaymentsService)
  })

  describe('createPaymentIntent', () => {
    it('creates a Stripe PaymentIntent and saves a Payment record for a PENDING order', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockResolvedValueOnce(buildMockOrder())
      mockStripeService.client.paymentIntents.create.mockResolvedValueOnce(buildMockPaymentIntent())
      mockPrismaService.payment.create.mockResolvedValueOnce({})

      const result = await paymentsService.createPaymentIntent(ORDER_ID, null, 'token-xyz')

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      expect(mockOrdersQueryService.findOneByIdForCaller).toHaveBeenCalledWith(
        ORDER_ID,
        null,
        'token-xyz',
      )
      expect(mockStripeService.client.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4998,
          currency: 'usd',
          payment_method_types: ['card', 'klarna', 'afterpay_clearpay'],
          metadata: { orderId: ORDER_ID },
        }),
        { idempotencyKey: `create-intent-${ORDER_ID}` },
      )
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderId: ORDER_ID, stripeId: STRIPE_INTENT_ID }),
        }),
      )
    })

    it('returns existing clientSecret when a Payment record already exists', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockResolvedValueOnce(buildMockOrder())
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({ stripeId: STRIPE_INTENT_ID })
      mockStripeService.client.paymentIntents.retrieve.mockResolvedValueOnce(
        buildMockPaymentIntent(),
      )

      const result = await paymentsService.createPaymentIntent(ORDER_ID, null, 'token-xyz')

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      expect(mockStripeService.client.paymentIntents.create).not.toHaveBeenCalled()
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled()
    })

    it('propagates NotFoundException from authz when the order does not exist', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockRejectedValueOnce(new NotFoundException())

      await expect(
        paymentsService.createPaymentIntent(ORDER_ID, null, 'token-xyz'),
      ).rejects.toThrow(NotFoundException)
    })

    it('propagates ForbiddenException when a non-owner caller has no token (#537 IDOR)', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockRejectedValueOnce(new ForbiddenException())
      const otherUser = { id: 'user-other', role: Role.USER } as User

      await expect(paymentsService.createPaymentIntent(ORDER_ID, otherUser, null)).rejects.toThrow(
        ForbiddenException,
      )
      expect(mockStripeService.client.paymentIntents.create).not.toHaveBeenCalled()
    })

    it('propagates UnauthorizedException when guest has no order-access token (#537 IDOR)', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockRejectedValueOnce(new UnauthorizedException())

      await expect(paymentsService.createPaymentIntent(ORDER_ID, null, null)).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockStripeService.client.paymentIntents.create).not.toHaveBeenCalled()
    })

    it('throws BadRequestException when the order status is not PENDING', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockResolvedValueOnce(
        buildMockOrder({ status: 'PAID' }),
      )

      await expect(
        paymentsService.createPaymentIntent(ORDER_ID, null, 'token-xyz'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when Stripe returns no client_secret', async () => {
      mockOrdersQueryService.findOneByIdForCaller.mockResolvedValueOnce(buildMockOrder())
      mockStripeService.client.paymentIntents.create.mockResolvedValueOnce(
        buildMockPaymentIntent({ client_secret: null }),
      )

      await expect(
        paymentsService.createPaymentIntent(ORDER_ID, null, 'token-xyz'),
      ).rejects.toThrow(ConflictException)
    })
  })
})

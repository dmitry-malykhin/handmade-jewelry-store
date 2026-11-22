import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Prisma } from '@prisma/client'
import type { Request } from 'express'
import type { RawBodyRequest } from '@nestjs/common'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeService } from './stripe.service'
import { StripeWebhooksService } from './stripe-webhooks.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const FAKE_STRIPE_SIGNATURE = 't=1234,v1=abcdef'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/stripe')
  await $allureSubSuite('stripe-webhooks.controller')
  await $allureSeverity('normal')
})

describe('StripeWebhooksController', () => {
  let stripeWebhooksController: StripeWebhooksController
  let mockStripeService: jest.Mocked<Pick<StripeService, 'constructWebhookEvent'>>
  let mockStripeWebhooksService: jest.Mocked<
    Pick<
      StripeWebhooksService,
      | 'handlePaymentIntentSucceeded'
      | 'handlePaymentIntentFailed'
      | 'handleChargeRefunded'
      | 'handleChargeDisputeCreated'
    >
  >

  const mockPrismaService = {
    processedStripeEvent: {
      create: jest.fn(),
    },
  }

  beforeEach(async () => {
    mockStripeService = { constructWebhookEvent: jest.fn() }
    mockStripeWebhooksService = {
      handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(undefined),
      handlePaymentIntentFailed: jest.fn().mockResolvedValue(undefined),
      handleChargeRefunded: jest.fn().mockResolvedValue(undefined),
      handleChargeDisputeCreated: jest.fn(),
    }
    mockPrismaService.processedStripeEvent.create.mockReset()
    mockPrismaService.processedStripeEvent.create.mockResolvedValue({
      id: 'evt_default',
      type: 'unknown',
      receivedAt: new Date(),
    })

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [
        { provide: StripeService, useValue: mockStripeService },
        { provide: StripeWebhooksService, useValue: mockStripeWebhooksService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    stripeWebhooksController = module.get<StripeWebhooksController>(StripeWebhooksController)
  })

  const buildFakeRequest = (rawBody?: Buffer): RawBodyRequest<Request> =>
    ({ rawBody }) as RawBodyRequest<Request>

  it('returns { received: true } and dispatches payment_intent.succeeded', async () => {
    const fakeEvent = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    } as unknown as Stripe.Event
    const rawBody = Buffer.from('{}')
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    const result = await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(rawBody),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(result).toEqual({ received: true })
    expect(mockStripeWebhooksService.handlePaymentIntentSucceeded).toHaveBeenCalledWith(
      fakeEvent.data.object,
    )
  })

  it('dispatches payment_intent.payment_failed', async () => {
    const fakeEvent = {
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(mockStripeWebhooksService.handlePaymentIntentFailed).toHaveBeenCalledWith(
      fakeEvent.data.object,
    )
  })

  it('dispatches charge.refunded', async () => {
    const fakeEvent = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(mockStripeWebhooksService.handleChargeRefunded).toHaveBeenCalledWith(
      fakeEvent.data.object,
    )
  })

  it('dispatches charge.dispute.created', async () => {
    const fakeEvent = {
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(mockStripeWebhooksService.handleChargeDisputeCreated).toHaveBeenCalledWith(
      fakeEvent.data.object,
    )
  })

  it('awaits charge.dispute.created so Stripe retries on failure instead of dropping the event (#534)', async () => {
    const fakeEvent = {
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)
    mockStripeWebhooksService.handleChargeDisputeCreated.mockRejectedValueOnce(
      new Error('slack down'),
    )

    await expect(
      stripeWebhooksController.handleStripeWebhook(
        buildFakeRequest(Buffer.from('{}')),
        FAKE_STRIPE_SIGNATURE,
      ),
    ).rejects.toThrow('slack down')
  })

  it('returns { received: true } for unhandled event types', async () => {
    const fakeEvent = {
      type: 'customer.created',
      data: { object: {} },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    const result = await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(result).toEqual({ received: true })
  })

  it('throws BadRequestException when rawBody is missing', async () => {
    await expect(
      stripeWebhooksController.handleStripeWebhook(buildFakeRequest(), FAKE_STRIPE_SIGNATURE),
    ).rejects.toThrow(BadRequestException)
  })

  // ── Idempotent dispatch — Stripe event replay protection (#540) ──────────

  it('skips dispatch when the same event.id arrives twice (P2002 on INSERT)', async () => {
    const fakeEvent = {
      id: 'evt_replay_1',
      type: 'charge.refunded',
      data: { object: { id: 'ch_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`id`)',
      { code: 'P2002', clientVersion: 'test' },
    )
    mockPrismaService.processedStripeEvent.create.mockRejectedValueOnce(duplicateError)

    const result = await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(result).toEqual({ received: true })
    expect(mockStripeWebhooksService.handleChargeRefunded).not.toHaveBeenCalled()
  })

  it('records event.id before dispatching so Stripe retries do not double-process', async () => {
    const fakeEvent = {
      id: 'evt_first_time',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    } as unknown as Stripe.Event
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    await stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(Buffer.from('{}')),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(mockPrismaService.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_first_time', type: 'payment_intent.succeeded' },
    })
    expect(mockStripeWebhooksService.handlePaymentIntentSucceeded).toHaveBeenCalled()
  })

  it('propagates StripeSignatureVerificationError when the signature is invalid', async () => {
    const rawBody = Buffer.from('{}')
    mockStripeService.constructWebhookEvent.mockImplementationOnce(() => {
      throw new Stripe.errors.StripeSignatureVerificationError({
        type: 'invalid_request_error',
        message: 'No signatures found matching the expected signature for payload',
        detail: '',
      })
    })

    await expect(
      stripeWebhooksController.handleStripeWebhook(buildFakeRequest(rawBody), 'bad_signature'),
    ).rejects.toThrow(Stripe.errors.StripeSignatureVerificationError)
  })
})

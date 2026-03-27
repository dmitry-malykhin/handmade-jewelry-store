import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import type { RawBodyRequest } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeService } from './stripe.service'
import { StripeWebhooksService } from './stripe-webhooks.service'

const FAKE_STRIPE_SIGNATURE = 't=1234,v1=abcdef'

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

  beforeEach(async () => {
    mockStripeService = { constructWebhookEvent: jest.fn() }
    mockStripeWebhooksService = {
      handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(undefined),
      handlePaymentIntentFailed: jest.fn().mockResolvedValue(undefined),
      handleChargeRefunded: jest.fn().mockResolvedValue(undefined),
      handleChargeDisputeCreated: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [
        { provide: StripeService, useValue: mockStripeService },
        { provide: StripeWebhooksService, useValue: mockStripeWebhooksService },
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

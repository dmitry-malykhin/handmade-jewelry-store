import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import type { RawBodyRequest } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeWebhooksController } from './stripe-webhooks.controller'
import { StripeService } from './stripe.service'

const FAKE_STRIPE_SIGNATURE = 't=1234,v1=abcdef'

describe('StripeWebhooksController', () => {
  let stripeWebhooksController: StripeWebhooksController
  let mockStripeService: jest.Mocked<Pick<StripeService, 'constructWebhookEvent'>>

  beforeEach(async () => {
    mockStripeService = {
      constructWebhookEvent: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [{ provide: StripeService, useValue: mockStripeService }],
    }).compile()

    stripeWebhooksController = module.get<StripeWebhooksController>(StripeWebhooksController)
  })

  const buildFakeRequest = (rawBody?: Buffer): RawBodyRequest<Request> =>
    ({ rawBody }) as RawBodyRequest<Request>

  it('returns { received: true } when the signature is valid', () => {
    const fakeEvent = { id: 'evt_test', type: 'payment_intent.succeeded' } as Stripe.Event
    const rawBody = Buffer.from('{"id":"evt_test"}')
    mockStripeService.constructWebhookEvent.mockReturnValueOnce(fakeEvent)

    const result = stripeWebhooksController.handleStripeWebhook(
      buildFakeRequest(rawBody),
      FAKE_STRIPE_SIGNATURE,
    )

    expect(result).toEqual({ received: true })
    expect(mockStripeService.constructWebhookEvent).toHaveBeenCalledWith(
      rawBody,
      FAKE_STRIPE_SIGNATURE,
    )
  })

  it('throws BadRequestException when rawBody is missing', () => {
    expect(() =>
      stripeWebhooksController.handleStripeWebhook(buildFakeRequest(), FAKE_STRIPE_SIGNATURE),
    ).toThrow(BadRequestException)
  })

  it('propagates StripeSignatureVerificationError when the signature is invalid', () => {
    const rawBody = Buffer.from('{"id":"evt_test"}')
    mockStripeService.constructWebhookEvent.mockImplementationOnce(() => {
      throw new Stripe.errors.StripeSignatureVerificationError({
        // 'invalid_request_error' is the closest built-in RawErrorType for signature errors
        type: 'invalid_request_error',
        message: 'No signatures found matching the expected signature for payload',
        detail: '',
      })
    })

    expect(() =>
      stripeWebhooksController.handleStripeWebhook(buildFakeRequest(rawBody), 'bad_signature'),
    ).toThrow(Stripe.errors.StripeSignatureVerificationError)
  })
})

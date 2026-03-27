import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import Stripe from 'stripe'
import { StripeService } from './stripe.service'

const FAKE_STRIPE_SECRET_KEY = 'sk_test_fake_key'
const FAKE_WEBHOOK_SECRET = 'whsec_fake_secret'

describe('StripeService', () => {
  let stripeService: StripeService
  let mockConfigService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return FAKE_STRIPE_SECRET_KEY
        if (key === 'STRIPE_WEBHOOK_SECRET') return FAKE_WEBHOOK_SECRET
        throw new Error(`Unknown config key: ${key}`)
      }),
    } as unknown as jest.Mocked<ConfigService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile()

    stripeService = module.get<StripeService>(StripeService)
  })

  it('initializes Stripe client with the secret key from config', () => {
    expect(stripeService.client).toBeInstanceOf(Stripe)
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('STRIPE_SECRET_KEY')
  })

  describe('constructWebhookEvent', () => {
    it('calls stripe.webhooks.constructEvent with raw body, signature, and webhook secret', () => {
      const fakeEvent = { id: 'evt_test', type: 'payment_intent.succeeded' } as Stripe.Event
      const rawBody = Buffer.from('{"id":"evt_test"}')
      const stripeSignature = 't=1234,v1=abcdef'

      jest.spyOn(stripeService.client.webhooks, 'constructEvent').mockReturnValueOnce(fakeEvent)

      const result = stripeService.constructWebhookEvent(rawBody, stripeSignature)

      expect(stripeService.client.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        stripeSignature,
        FAKE_WEBHOOK_SECRET,
      )
      expect(result).toBe(fakeEvent)
    })

    it('propagates StripeSignatureVerificationError when the signature is invalid', () => {
      const rawBody = Buffer.from('{"id":"evt_test"}')
      const invalidSignature = 'invalid_signature'

      jest.spyOn(stripeService.client.webhooks, 'constructEvent').mockImplementationOnce(() => {
        throw new Stripe.errors.StripeSignatureVerificationError({
          // 'invalid_request_error' is the closest built-in RawErrorType for signature errors
          type: 'invalid_request_error',
          message: 'No signatures found matching the expected signature for payload',
          detail: '',
        })
      })

      expect(() => stripeService.constructWebhookEvent(rawBody, invalidSignature)).toThrow(
        Stripe.errors.StripeSignatureVerificationError,
      )
    })
  })
})

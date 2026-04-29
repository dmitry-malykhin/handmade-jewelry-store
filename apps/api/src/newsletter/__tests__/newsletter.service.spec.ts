import { Test, TestingModule } from '@nestjs/testing'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'
import { NewsletterService } from '../newsletter.service'

describe('NewsletterService', () => {
  let service: NewsletterService
  const subscribeEmail = jest.fn()

  beforeEach(async () => {
    subscribeEmail.mockReset()

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: KlaviyoNewsletterClient, useValue: { subscribeEmail } },
      ],
    }).compile()

    service = moduleRef.get(NewsletterService)
  })

  it('forwards the email to the Klaviyo client and returns its result', async () => {
    subscribeEmail.mockResolvedValue({ status: 'queued' })

    const result = await service.subscribe('user@example.com')

    expect(subscribeEmail).toHaveBeenCalledWith('user@example.com')
    expect(result).toEqual({ status: 'queued' })
  })

  it('propagates errors from the Klaviyo client', async () => {
    subscribeEmail.mockRejectedValue(new Error('Klaviyo down'))

    await expect(service.subscribe('user@example.com')).rejects.toThrow('Klaviyo down')
  })
})

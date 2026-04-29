import { ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'

describe('KlaviyoNewsletterClient', () => {
  const env = new Map<string, string | undefined>()
  const configServiceStub = {
    get: (key: string) => env.get(key),
  }
  let client: KlaviyoNewsletterClient

  beforeEach(async () => {
    env.clear()
    jest.restoreAllMocks()

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [KlaviyoNewsletterClient, { provide: ConfigService, useValue: configServiceStub }],
    }).compile()

    client = moduleRef.get(KlaviyoNewsletterClient)
  })

  it("returns 'skipped' without calling fetch when credentials are missing", async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')

    const result = await client.subscribeEmail('user@example.com')

    expect(result).toEqual({ status: 'skipped' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("returns 'queued' on a 202 from Klaviyo", async () => {
    env.set('KLAVIYO_PRIVATE_API_KEY', 'pk_test_secret')
    env.set('KLAVIYO_NEWSLETTER_LIST_ID', 'LIST123')

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }))

    const result = await client.subscribeEmail('user@example.com')

    expect(result).toEqual({ status: 'queued' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Klaviyo-API-Key pk_test_secret')
    expect(headers.revision).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const body = JSON.parse(init?.body as string)
    expect(body.data.relationships.list.data.id).toBe('LIST123')
    expect(body.data.attributes.profiles.data[0].attributes.email).toBe('user@example.com')
    expect(
      body.data.attributes.profiles.data[0].attributes.subscriptions.email.marketing.consent,
    ).toBe('SUBSCRIBED')
  })

  it('throws ServiceUnavailableException on a non-202 response', async () => {
    env.set('KLAVIYO_PRIVATE_API_KEY', 'pk_test_secret')
    env.set('KLAVIYO_NEWSLETTER_LIST_ID', 'LIST123')

    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('rate limited', { status: 429 }))

    await expect(client.subscribeEmail('user@example.com')).rejects.toThrow(
      ServiceUnavailableException,
    )
  })
})

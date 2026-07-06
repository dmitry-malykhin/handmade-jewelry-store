import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { SlackNotifierService } from './slack-notifier.service'

const WEBHOOK_URL = 'https://hooks.slack.com/services/T000/B000/token'
const SAMPLE_PAYLOAD = {
  disputeId: 'dp_test',
  chargeId: 'ch_test',
  orderId: 'order_abc12345',
  amountUsd: 49.99,
  reason: 'fraudulent',
  adminUrl: 'https://shop.example/admin/orders/order_abc12345',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/stripe')
  await $allureSubSuite('slack-notifier.service')
  await $allureSeverity('normal')
})

describe('SlackNotifierService.sendDisputeAlert', () => {
  let service: SlackNotifierService
  let mockConfigService: { get: jest.Mock }
  let fetchSpy: jest.SpyInstance

  beforeEach(async () => {
    mockConfigService = { get: jest.fn() }
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackNotifierService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile()
    service = module.get<SlackNotifierService>(SlackNotifierService)
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('is a no-op when SLACK_WEBHOOK_URL is not configured', async () => {
    mockConfigService.get.mockReturnValue(undefined)

    await service.sendDisputeAlert(SAMPLE_PAYLOAD)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('POSTs a JSON body containing the short order id and amount to the webhook URL', async () => {
    mockConfigService.get.mockReturnValue(WEBHOOK_URL)

    await service.sendDisputeAlert(SAMPLE_PAYLOAD)

    expect(fetchSpy).toHaveBeenCalledWith(
      WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const rawBody = (fetchSpy.mock.calls[0]?.[1] as { body: string }).body
    expect(rawBody).toContain('ABC12345')
    expect(rawBody).toContain('$49.99')
    expect(rawBody).toContain('dp_test')
  })

  it('swallows non-2xx responses so the caller webhook can still ack', async () => {
    mockConfigService.get.mockReturnValue(WEBHOOK_URL)
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'error' }))

    await expect(service.sendDisputeAlert(SAMPLE_PAYLOAD)).resolves.toBeUndefined()
  })

  it('swallows network errors — Slack outages must not block webhook processing', async () => {
    mockConfigService.get.mockReturnValue(WEBHOOK_URL)
    fetchSpy.mockRejectedValueOnce(new Error('ECONNRESET'))

    await expect(service.sendDisputeAlert(SAMPLE_PAYLOAD)).resolves.toBeUndefined()
  })
})

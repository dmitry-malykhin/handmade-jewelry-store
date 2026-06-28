import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { ShippingService } from './shipping.service'
import { ShippingWebhooksController } from './shipping-webhooks.controller'

const mockShippingService = {
  handleWebhook: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/shipping')
  await $allureSubSuite('shipping-webhooks.controller')
  await $allureSeverity('critical')
})

describe('ShippingWebhooksController', () => {
  let controller: ShippingWebhooksController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingWebhooksController],
      providers: [{ provide: ShippingService, useValue: mockShippingService }],
    }).compile()
    controller = module.get(ShippingWebhooksController)
    jest.clearAllMocks()
  })

  it('forwards rawBody (decoded as utf8) + signature header to handleWebhook', async () => {
    const rawPayload = Buffer.from('{"event":"updated"}', 'utf8')
    const request = { rawBody: rawPayload } as RawBodyRequest<Request>
    mockShippingService.handleWebhook.mockResolvedValue({ received: true })

    await controller.handleWebhook(request, 'sig-abc')

    expect(mockShippingService.handleWebhook).toHaveBeenCalledWith('{"event":"updated"}', 'sig-abc')
  })

  it('throws BadRequestException if rawBody is missing', async () => {
    const request = { rawBody: undefined } as unknown as RawBodyRequest<Request>

    await expect(controller.handleWebhook(request, 'sig-abc')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(mockShippingService.handleWebhook).not.toHaveBeenCalled()
  })

  it('forwards undefined signature when header is absent (service decides reject)', async () => {
    const request = { rawBody: Buffer.from('{}') } as RawBodyRequest<Request>
    mockShippingService.handleWebhook.mockResolvedValue(undefined)

    await controller.handleWebhook(request, undefined)

    expect(mockShippingService.handleWebhook).toHaveBeenCalledWith('{}', undefined)
  })
})

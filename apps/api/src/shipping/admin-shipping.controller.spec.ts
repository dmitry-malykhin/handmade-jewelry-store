import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { PurchaseLabelDto } from './dto/purchase-label.dto'
import { AdminShippingController } from './admin-shipping.controller'
import { ShippingService } from './shipping.service'

const mockService = {
  getStatus: jest.fn(),
  purchaseLabel: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/shipping')
  await $allureSubSuite('admin-shipping.controller')
  await $allureSeverity('normal')
})

describe('AdminShippingController', () => {
  let controller: AdminShippingController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShippingController],
      providers: [{ provide: ShippingService, useValue: mockService }],
    }).compile()
    controller = module.get(AdminShippingController)
    jest.clearAllMocks()
  })

  it('getStatus() returns the live-mode flag', async () => {
    mockService.getStatus.mockResolvedValue({ isLiveMode: false })

    const result = await controller.getStatus()

    expect(result.isLiveMode).toBe(false)
  })

  it('purchaseLabel() flattens (orderId, carrier, insuranceCents) into a single argument', async () => {
    const dto: PurchaseLabelDto = { carrier: 'USPS', insuranceCents: 500 }
    mockService.purchaseLabel.mockResolvedValue({ shipmentId: 'shp1', trackingNumber: 'TRK1' })

    await controller.purchaseLabel('order-1', dto)

    expect(mockService.purchaseLabel).toHaveBeenCalledWith({
      orderId: 'order-1',
      carrier: 'USPS',
      insuranceCents: 500,
    })
  })
})

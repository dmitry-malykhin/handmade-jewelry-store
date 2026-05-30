import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const CLIENT_SECRET = 'pi_test_secret_xyz'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/payments')
  await $allureSubSuite('payments.controller')
  await $allureSeverity('normal')
})

describe('PaymentsController', () => {
  let paymentsController: PaymentsController
  let mockPaymentsService: jest.Mocked<Pick<PaymentsService, 'createPaymentIntent'>>

  beforeEach(async () => {
    mockPaymentsService = {
      createPaymentIntent: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile()

    paymentsController = module.get<PaymentsController>(PaymentsController)
  })

  describe('createPaymentIntent', () => {
    it('delegates to PaymentsService and returns clientSecret', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })

      const result = await paymentsController.createPaymentIntent({ orderId: 'order_123' })

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith('order_123')
    })
  })
})

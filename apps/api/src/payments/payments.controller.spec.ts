import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

const CLIENT_SECRET = 'pi_test_secret_xyz'

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

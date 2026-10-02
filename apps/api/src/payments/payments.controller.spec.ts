import { Test, TestingModule } from '@nestjs/testing'
import { Role, type User } from '@prisma/client'
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
  await $allureSeverity('critical')
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
    it('passes anonymous caller + null token through to the service', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })

      const result = await paymentsController.createPaymentIntent(
        { orderId: 'order_123' },
        null,
        undefined,
        undefined,
      )

      expect(result).toEqual({ clientSecret: CLIENT_SECRET })
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith('order_123', null, null)
    })

    it('forwards the JWT-attached user when present', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })
      const authedUser = { id: 'user-1', role: Role.USER } as User

      await paymentsController.createPaymentIntent(
        { orderId: 'order_123' },
        authedUser,
        undefined,
        undefined,
      )

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        'order_123',
        authedUser,
        null,
      )
    })

    it('accepts the guest order-access token via X-Order-Access-Token header', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })

      await paymentsController.createPaymentIntent(
        { orderId: 'order_123' },
        null,
        'signed-order-token',
        undefined,
      )

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        'order_123',
        null,
        'signed-order-token',
      )
    })

    it('falls back to ?token= query when header is absent', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })

      await paymentsController.createPaymentIntent(
        { orderId: 'order_123' },
        null,
        undefined,
        'signed-order-token',
      )

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        'order_123',
        null,
        'signed-order-token',
      )
    })

    it('prefers header over query when both are provided', async () => {
      mockPaymentsService.createPaymentIntent.mockResolvedValueOnce({
        clientSecret: CLIENT_SECRET,
      })

      await paymentsController.createPaymentIntent(
        { orderId: 'order_123' },
        null,
        'header-token',
        'query-token',
      )

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        'order_123',
        null,
        'header-token',
      )
    })
  })
})

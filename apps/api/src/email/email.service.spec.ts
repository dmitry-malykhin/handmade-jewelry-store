import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EmailService } from './email.service'

const mockResendEmailsSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendEmailsSend },
  })),
}))

const buildMockConfigService = () => ({
  getOrThrow: jest.fn().mockReturnValue('re_test_key'),
})

const mockOrderConfirmationData = {
  recipientEmail: 'guest@example.com',
  orderId: 'order-abc-123',
  items: [{ title: 'Silver Ring', quantity: 1, price: 49.99 }],
  subtotal: 49.99,
  shippingCost: 0,
  total: 49.99,
  shippingAddress: {
    fullName: 'Jane Doe',
    addressLine1: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    country: 'US',
  },
}

describe('EmailService', () => {
  let emailService: EmailService

  beforeEach(async () => {
    mockResendEmailsSend.mockReset()

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, { provide: ConfigService, useValue: buildMockConfigService() }],
    }).compile()

    emailService = module.get<EmailService>(EmailService)
  })

  describe('sendOrderConfirmation()', () => {
    it('calls Resend with correct recipient and subject', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await emailService.sendOrderConfirmation(mockOrderConfirmationData)

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('Order confirmed'),
        }),
      )
    })

    it('does not throw when Resend returns an error', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: { message: 'rate limit' } })

      await expect(
        emailService.sendOrderConfirmation(mockOrderConfirmationData),
      ).resolves.not.toThrow()
    })

    it('does not throw when Resend SDK throws unexpectedly', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('network failure'))

      await expect(
        emailService.sendOrderConfirmation(mockOrderConfirmationData),
      ).resolves.not.toThrow()
    })
  })

  describe('sendWelcome()', () => {
    it('calls Resend with correct recipient and welcome subject', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await emailService.sendWelcome({ recipientEmail: 'new@example.com' })

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          subject: expect.stringContaining('Welcome'),
        }),
      )
    })
  })

  describe('sendShippingNotification()', () => {
    it('calls Resend with correct recipient and shipping subject', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await emailService.sendShippingNotification({
        recipientEmail: 'guest@example.com',
        orderId: 'order-abc-123',
        trackingNumber: 'TRK999',
      })

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('on its way'),
        }),
      )
    })
  })

  describe('sendRefundProcessed()', () => {
    it('calls Resend with correct recipient and refund subject', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await emailService.sendRefundProcessed({
        recipientEmail: 'guest@example.com',
        orderId: 'order-abc-123',
        refundAmount: 49.99,
      })

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('Refund processed'),
        }),
      )
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EmailService } from './email.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockResendEmailsSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendEmailsSend },
  })),
}))

const buildMockConfigService = () => ({
  getOrThrow: jest.fn().mockReturnValue('re_test_key'),
  get: jest.fn().mockReturnValue('re_test_key'),
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

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('email.service')
  await $allureSeverity('normal')
})

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

  describe('sendContactMessage()', () => {
    it('routes the message to STORE_OWNER_EMAIL from ConfigService.getOrThrow', async () => {
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await emailService.sendContactMessage({
        senderName: 'Buyer',
        senderEmail: 'buyer@example.com',
        subject: 'Question',
        message: 'Hi!',
      })

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 're_test_key', // mock returns this for any getOrThrow key
          reply_to: 'buyer@example.com',
        }),
      )
    })

    it('throws when STORE_OWNER_EMAIL is missing (no silent fallback)', async () => {
      const configService = {
        get: jest.fn().mockReturnValue('re_test_key'),
        getOrThrow: jest.fn().mockImplementation((key: string) => {
          if (key === 'STORE_OWNER_EMAIL') {
            throw new Error(`Configuration key "${key}" does not exist`)
          }
          return 're_test_key'
        }),
      }
      const module = await Test.createTestingModule({
        providers: [EmailService, { provide: ConfigService, useValue: configService }],
      }).compile()
      const service = module.get<EmailService>(EmailService)

      await expect(
        service.sendContactMessage({
          senderName: 'Buyer',
          senderEmail: 'buyer@example.com',
          subject: 'Question',
          message: 'Hi!',
        }),
      ).rejects.toThrow(/STORE_OWNER_EMAIL/)

      expect(mockResendEmailsSend).not.toHaveBeenCalled()
    })
  })

  describe('FROM address', () => {
    it('uses RESEND_FROM_ADDRESS when configured', async () => {
      const configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'RESEND_FROM_ADDRESS') return 'orders@senichka.com'
          return 're_test_key'
        }),
        getOrThrow: jest.fn().mockReturnValue('owner@senichka.com'),
      }
      const module = await Test.createTestingModule({
        providers: [EmailService, { provide: ConfigService, useValue: configService }],
      }).compile()
      const service = module.get<EmailService>(EmailService)
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await service.sendOrderConfirmation(mockOrderConfirmationData)

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'orders@senichka.com' }),
      )
    })

    it('falls back to onboarding@resend.dev when RESEND_FROM_ADDRESS is unset', async () => {
      const configService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'RESEND_FROM_ADDRESS') return undefined
          return 're_test_key'
        }),
        getOrThrow: jest.fn().mockReturnValue('owner@senichka.com'),
      }
      const module = await Test.createTestingModule({
        providers: [EmailService, { provide: ConfigService, useValue: configService }],
      }).compile()
      const service = module.get<EmailService>(EmailService)
      mockResendEmailsSend.mockResolvedValueOnce({ error: null })

      await service.sendOrderConfirmation(mockOrderConfirmationData)

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'onboarding@resend.dev' }),
      )
    })
  })
})

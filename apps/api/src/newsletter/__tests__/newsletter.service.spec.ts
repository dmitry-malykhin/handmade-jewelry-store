import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { NewsletterConsentStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { EmailService } from '../../email/email.service'
import { PrismaService } from '../../prisma/prisma.service'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'
import { NEWSLETTER_FORM_VERSION, NewsletterService } from '../newsletter.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/newsletter')
  await $allureSubSuite('newsletter.service')
  await $allureSeverity('critical')
})

describe('NewsletterService', () => {
  let service: NewsletterService

  const subscribeEmail = jest.fn()
  const sendNewsletterConfirmation = jest.fn()
  const newsletterConsent = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  }
  const prismaService = { newsletterConsent }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: prismaService },
        { provide: KlaviyoNewsletterClient, useValue: { subscribeEmail } },
        { provide: EmailService, useValue: { sendNewsletterConfirmation } },
      ],
    }).compile()

    service = moduleRef.get(NewsletterService)
  })

  describe('subscribe', () => {
    it('persists a PENDING consent row with audit trail before sending email', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      const result = await service.subscribe({
        email: 'user@example.com',
        ipAddress: '203.0.113.7',
        userAgent: 'Mozilla/5.0',
        sourceUrl: '/en/products',
      })

      expect(newsletterConsent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com',
          status: NewsletterConsentStatus.PENDING,
          ipAddress: '203.0.113.7',
          userAgent: 'Mozilla/5.0',
          formVersion: NEWSLETTER_FORM_VERSION,
          sourceUrl: '/en/products',
        }),
      })
      expect(result).toEqual({ status: 'pending-confirmation' })
    })

    it('never calls Klaviyo on subscribe (Klaviyo only fires after confirmation)', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      await service.subscribe({
        email: 'user@example.com',
        ipAddress: null,
        userAgent: null,
        sourceUrl: null,
      })

      expect(subscribeEmail).not.toHaveBeenCalled()
    })

    it('sends a Resend confirmation email with the plain token', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      await service.subscribe({
        email: 'user@example.com',
        ipAddress: null,
        userAgent: null,
        sourceUrl: null,
      })

      expect(sendNewsletterConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'user@example.com',
          confirmationToken: expect.any(String),
        }),
      )
    })

    it('stores a hashed token, never the plain one', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      await service.subscribe({
        email: 'user@example.com',
        ipAddress: null,
        userAgent: null,
        sourceUrl: null,
      })

      const storedHash = newsletterConsent.create.mock.calls[0][0].data.confirmationTokenHash
      const emailedPlainToken = sendNewsletterConfirmation.mock.calls[0][0].confirmationToken
      expect(storedHash).not.toBe(emailedPlainToken)
      expect(await bcrypt.compare(emailedPlainToken, storedHash)).toBe(true)
    })
  })

  describe('confirm', () => {
    it('flips PENDING → CONFIRMED and forwards to Klaviyo when the token matches', async () => {
      const tokenHash = await bcrypt.hash('plain-token', 10)
      newsletterConsent.findMany.mockResolvedValueOnce([
        {
          id: 'nc1',
          confirmationTokenHash: tokenHash,
        },
      ])
      subscribeEmail.mockResolvedValueOnce({ status: 'queued' })

      const result = await service.confirm('user@example.com', 'plain-token')

      expect(newsletterConsent.update).toHaveBeenCalledWith({
        where: { id: 'nc1' },
        data: expect.objectContaining({
          status: NewsletterConsentStatus.CONFIRMED,
          confirmationTokenHash: null,
        }),
      })
      expect(subscribeEmail).toHaveBeenCalledWith('user@example.com')
      expect(result).toEqual({ status: 'confirmed' })
    })

    it('returns already-confirmed if the email is already subscribed', async () => {
      newsletterConsent.findMany.mockResolvedValueOnce([])
      newsletterConsent.findFirst.mockResolvedValueOnce({ id: 'nc-existing' })

      const result = await service.confirm('user@example.com', 'any-token')

      expect(result).toEqual({ status: 'already-confirmed' })
      expect(subscribeEmail).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when no pending consent exists', async () => {
      newsletterConsent.findMany.mockResolvedValueOnce([])
      newsletterConsent.findFirst.mockResolvedValueOnce(null)

      await expect(service.confirm('user@example.com', 'any-token')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws BadRequestException when the token does not match any pending row', async () => {
      const otherHash = await bcrypt.hash('other-token', 10)
      newsletterConsent.findMany.mockResolvedValueOnce([
        { id: 'nc1', confirmationTokenHash: otherHash },
      ])

      await expect(service.confirm('user@example.com', 'wrong-token')).rejects.toThrow(
        BadRequestException,
      )
      expect(subscribeEmail).not.toHaveBeenCalled()
    })
  })
})

import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { NewsletterConsentStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { EmailService } from '../../email/email.service'
import { PrismaService } from '../../prisma/prisma.service'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'
import { NewsletterController } from '../newsletter.controller'
import { NewsletterService } from '../newsletter.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/newsletter')
  await $allureSubSuite('newsletter.integration')
  await $allureSeverity('critical')
})

describe('Newsletter HTTP integration (double opt-in)', () => {
  let app: INestApplication
  const subscribeEmail = jest.fn()
  const unsubscribeEmail = jest.fn()
  const sendNewsletterConfirmation = jest.fn()
  const newsletterConsent = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: { newsletterConsent } },
        { provide: KlaviyoNewsletterClient, useValue: { subscribeEmail, unsubscribeEmail } },
        { provide: EmailService, useValue: { sendNewsletterConfirmation } },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/newsletter/subscribe', () => {
    it('returns 202 pending-confirmation and does NOT call Klaviyo', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      const response = await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'user@example.com', consent: true })
        .expect(202)

      expect(response.body).toEqual({ status: 'pending-confirmation' })
      expect(subscribeEmail).not.toHaveBeenCalled()
      expect(sendNewsletterConfirmation).toHaveBeenCalledTimes(1)
    })

    it('captures IP and User-Agent into the consent row', async () => {
      newsletterConsent.create.mockResolvedValueOnce({ id: 'nc1' })

      await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .set('User-Agent', 'IntegrationTest/1.0')
        .send({ email: 'user@example.com', consent: true })
        .expect(202)

      const created = newsletterConsent.create.mock.calls[0][0].data
      expect(created.userAgent).toBe('IntegrationTest/1.0')
      expect(typeof created.ipAddress === 'string' || created.ipAddress === null).toBe(true)
    })

    it('returns 400 when consent is false (GDPR Art. 7(1))', async () => {
      await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'user@example.com', consent: false })
        .expect(400)

      expect(newsletterConsent.create).not.toHaveBeenCalled()
      expect(sendNewsletterConfirmation).not.toHaveBeenCalled()
    })

    it('returns 400 when consent is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'user@example.com' })
        .expect(400)

      expect(newsletterConsent.create).not.toHaveBeenCalled()
    })

    it.each(['not-an-email', '@nodomain.com', ''])(
      'returns 400 for invalid email %p',
      async (email) => {
        await request(app.getHttpServer())
          .post('/api/newsletter/subscribe')
          .send({ email, consent: true })
          .expect(400)
      },
    )

    it('rejects unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'user@example.com', consent: true, listId: 'override' })
        .expect(400)
    })
  })

  describe('POST /api/newsletter/confirm', () => {
    it('returns 200 confirmed and calls Klaviyo with SUBSCRIBED on valid token', async () => {
      const tokenHash = await bcrypt.hash('plain-token', 10)
      newsletterConsent.findMany.mockResolvedValueOnce([
        { id: 'nc1', confirmationTokenHash: tokenHash },
      ])
      subscribeEmail.mockResolvedValueOnce({ status: 'queued' })

      const response = await request(app.getHttpServer())
        .post('/api/newsletter/confirm')
        .send({ email: 'user@example.com', token: 'plain-token' })
        .expect(200)

      expect(response.body).toEqual({ status: 'confirmed' })
      expect(subscribeEmail).toHaveBeenCalledWith('user@example.com')
      expect(newsletterConsent.update.mock.calls[0][0].data.status).toBe(
        NewsletterConsentStatus.CONFIRMED,
      )
    })

    it('returns 400 for invalid token', async () => {
      const otherHash = await bcrypt.hash('other-token', 10)
      newsletterConsent.findMany.mockResolvedValueOnce([
        { id: 'nc1', confirmationTokenHash: otherHash },
      ])

      await request(app.getHttpServer())
        .post('/api/newsletter/confirm')
        .send({ email: 'user@example.com', token: 'wrong-token' })
        .expect(400)

      expect(subscribeEmail).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/newsletter/unsubscribe', () => {
    const { issueUnsubscribeToken } = jest.requireActual('../unsubscribe-token')

    it('returns 200 unsubscribed and calls Klaviyo when a valid token flips a CONFIRMED row', async () => {
      newsletterConsent.findMany.mockResolvedValueOnce([{ id: 'nc1', status: 'CONFIRMED' }])
      unsubscribeEmail.mockResolvedValueOnce({ status: 'queued' })
      const token = issueUnsubscribeToken('user@example.com')

      const response = await request(app.getHttpServer())
        .post('/api/newsletter/unsubscribe')
        .send({ email: 'user@example.com', token })
        .expect(200)

      expect(response.body).toEqual({ status: 'unsubscribed' })
      expect(unsubscribeEmail).toHaveBeenCalledWith('user@example.com')
    })

    it('returns 400 for a forged token', async () => {
      await request(app.getHttpServer())
        .post('/api/newsletter/unsubscribe')
        .send({ email: 'user@example.com', token: 'forged' })
        .expect(400)

      expect(unsubscribeEmail).not.toHaveBeenCalled()
    })
  })
})

/**
 * HTTP integration test for the Newsletter module — exercises the full
 * NestJS pipeline (ValidationPipe, controller, service) with the Klaviyo
 * client mocked. Mirrors the contract used by the frontend NewsletterForm.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'
import { NewsletterController } from '../newsletter.controller'
import { NewsletterService } from '../newsletter.service'

describe('Newsletter HTTP integration', () => {
  let app: INestApplication
  const subscribeEmail = jest.fn()

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        NewsletterService,
        { provide: KlaviyoNewsletterClient, useValue: { subscribeEmail } },
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
    subscribeEmail.mockReset()
  })

  it("returns 202 with status='queued' on success", async () => {
    subscribeEmail.mockResolvedValue({ status: 'queued' })

    const response = await request(app.getHttpServer())
      .post('/api/newsletter/subscribe')
      .send({ email: 'user@example.com' })
      .expect(202)

    expect(response.body).toEqual({ status: 'queued' })
    expect(subscribeEmail).toHaveBeenCalledWith('user@example.com')
  })

  it("returns 202 with status='skipped' when Klaviyo creds are missing", async () => {
    subscribeEmail.mockResolvedValue({ status: 'skipped' })

    const response = await request(app.getHttpServer())
      .post('/api/newsletter/subscribe')
      .send({ email: 'user@example.com' })
      .expect(202)

    expect(response.body).toEqual({ status: 'skipped' })
  })

  it('normalises email to lowercase + trims whitespace before forwarding', async () => {
    subscribeEmail.mockResolvedValue({ status: 'queued' })

    await request(app.getHttpServer())
      .post('/api/newsletter/subscribe')
      .send({ email: '  USER@Example.COM  ' })
      .expect(202)

    expect(subscribeEmail).toHaveBeenCalledWith('user@example.com')
  })

  it.each(['', 'not-an-email', 'missing@dot', '@nodomain.com', 'a'.repeat(250) + '@x.co'])(
    'returns 400 for invalid email %p',
    async (email) => {
      await request(app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email })
        .expect(400)

      expect(subscribeEmail).not.toHaveBeenCalled()
    },
  )

  it('rejects unknown fields (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/api/newsletter/subscribe')
      .send({ email: 'user@example.com', listId: 'override' })
      .expect(400)

    expect(subscribeEmail).not.toHaveBeenCalled()
  })
})

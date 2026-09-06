import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import * as request from 'supertest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { KlaviyoNewsletterClient } from '../klaviyo-newsletter.client'
import { NewsletterController } from '../newsletter.controller'
import { NewsletterService } from '../newsletter.service'

const subscribeEmail = jest.fn()

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/newsletter')
  await $allureSubSuite('newsletter.throttle')
  await $allureSeverity('critical')
})

describe('NewsletterController — rate limit', () => {
  let app: INestApplication

  beforeEach(async () => {
    subscribeEmail.mockReset()
    subscribeEmail.mockResolvedValue({ status: 'queued' })

    const moduleRef: TestingModule = await Test.createTestingModule({
      // Mirror AppModule so @Throttle('newsletterDaily') resolves.
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'default', ttl: 60_000, limit: 60 },
            { name: 'newsletterDaily', ttl: 86_400_000, limit: 20 },
          ],
        }),
      ],
      controllers: [NewsletterController],
      providers: [
        NewsletterService,
        { provide: KlaviyoNewsletterClient, useValue: { subscribeEmail } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('accepts a valid subscribe request with 202', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/newsletter/subscribe')
      .send({ email: 'user@example.com' })
    expect(response.status).toBe(202)
    expect(subscribeEmail).toHaveBeenCalledTimes(1)
  })

  it('returns 429 after the per-minute limit of 3 is exceeded', async () => {
    const server = app.getHttpServer()

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const ok = await request(server)
        .post('/api/newsletter/subscribe')
        .send({ email: `user${attempt}@example.com` })
      expect(ok.status).toBe(202)
    }
    const throttled = await request(server)
      .post('/api/newsletter/subscribe')
      .send({ email: 'user4@example.com' })
    expect(throttled.status).toBe(429)
    // Klaviyo side-effect never fires past the throttle boundary
    expect(subscribeEmail).toHaveBeenCalledTimes(3)
  })
})

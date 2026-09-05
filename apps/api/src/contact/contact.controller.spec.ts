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
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'
import { EmailService } from '../email/email.service'

const VALID_BODY = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  subject: 'Order question',
  message: 'I have a question about my recent order.',
}

const mockSendContactMessage = jest.fn().mockResolvedValue(undefined)
const mockEmailService = { sendContactMessage: mockSendContactMessage }

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/contact')
  await $allureSubSuite('contact.controller')
  await $allureSeverity('critical')
})

describe('ContactController', () => {
  let app: INestApplication

  beforeEach(async () => {
    mockSendContactMessage.mockClear()

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        // Mirror AppModule so @Throttle('contactDaily') resolves.
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'default', ttl: 60_000, limit: 60 },
            { name: 'contactDaily', ttl: 86_400_000, limit: 20 },
          ],
        }),
      ],
      controllers: [ContactController],
      providers: [
        ContactService,
        { provide: EmailService, useValue: mockEmailService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    // Match main.ts — without this, @IsEmpty on honeypot is a no-op.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('accepts a well-formed message and returns 204', async () => {
    const response = await request(app.getHttpServer()).post('/contact').send(VALID_BODY)
    expect(response.status).toBe(204)
    expect(mockSendContactMessage).toHaveBeenCalledTimes(1)
  })

  it('returns 429 after the per-minute limit of 3 is exceeded', async () => {
    const server = app.getHttpServer()

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const ok = await request(server).post('/contact').send(VALID_BODY)
      expect(ok.status).toBe(204)
    }
    const throttled = await request(server).post('/contact').send(VALID_BODY)
    expect(throttled.status).toBe(429)
    // Email side-effect never fires past the throttle boundary
    expect(mockSendContactMessage).toHaveBeenCalledTimes(3)
  })

  it('rejects with 400 when the honeypot field is filled (bot signature)', async () => {
    const response = await request(app.getHttpServer())
      .post('/contact')
      .send({ ...VALID_BODY, website: 'spammer.example.com' })
    expect(response.status).toBe(400)
    expect(mockSendContactMessage).not.toHaveBeenCalled()
  })

  it('accepts a body with an empty honeypot field (real user)', async () => {
    const response = await request(app.getHttpServer())
      .post('/contact')
      .send({ ...VALID_BODY, website: '' })
    expect(response.status).toBe(204)
    expect(mockSendContactMessage).toHaveBeenCalledTimes(1)
  })
})

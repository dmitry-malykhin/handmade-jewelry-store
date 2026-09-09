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
import { DiscountsController } from '../discounts.controller'
import { DiscountsService } from '../discounts.service'

const validate = jest.fn()

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/discounts')
  await $allureSubSuite('discounts.throttle')
  await $allureSeverity('critical')
})

describe('DiscountsController — public validate rate limit', () => {
  let app: INestApplication

  beforeEach(async () => {
    validate.mockReset()
    validate.mockResolvedValue({ code: 'X', type: 'PERCENTAGE', value: 10 })

    const moduleRef: TestingModule = await Test.createTestingModule({
      // Mirror AppModule so @Throttle('discountsDaily') resolves.
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'default', ttl: 60_000, limit: 60 },
            { name: 'discountsDaily', ttl: 86_400_000, limit: 20 },
          ],
        }),
      ],
      controllers: [DiscountsController],
      providers: [
        { provide: DiscountsService, useValue: { validate } },
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

  it('accepts a valid code with 200', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/discounts/validate')
      .send({ code: 'SUMMER10' })
    expect(response.status).toBe(200)
    expect(validate).toHaveBeenCalledTimes(1)
  })

  it('returns 429 after the per-minute limit of 3 is exceeded', async () => {
    const server = app.getHttpServer()

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const ok = await request(server)
        .post('/api/discounts/validate')
        .send({ code: `GUESS${attempt}` })
      expect(ok.status).toBe(200)
    }
    const throttled = await request(server).post('/api/discounts/validate').send({ code: 'GUESS4' })
    expect(throttled.status).toBe(429)
    // Service.validate never fires past the throttle boundary — brute-force does not reach DB
    expect(validate).toHaveBeenCalledTimes(3)
  })
})

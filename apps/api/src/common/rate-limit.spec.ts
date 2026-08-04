import { Body, Controller, INestApplication, Post } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { SkipThrottle, Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import * as request from 'supertest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Small stub controller exercising the three rate-limit contracts we ship:
//   - global default (60/min) via unadorned endpoint
//   - stricter @Throttle override on sensitive endpoints
//   - @SkipThrottle for webhook + health
@Controller('rl-test')
class RateLimitStubController {
  @Post('default')
  handleDefault(@Body() body: unknown) {
    return { ok: true, body }
  }

  @Post('strict')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  handleStrict(@Body() body: unknown) {
    return { ok: true, body }
  }

  @SkipThrottle()
  @Post('unlimited')
  handleUnlimited(@Body() body: unknown) {
    return { ok: true, body }
  }
}

describe('ThrottlerGuard wiring', () => {
  let app: INestApplication

  beforeAll(async () => {
    if (process.env.CI) {
      await $allureSuite('api/common')
      await $allureSubSuite('rate-limit')
      await $allureSeverity('critical')
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 60 }],
        }),
      ],
      controllers: [RateLimitStubController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 429 after the endpoint-specific @Throttle limit is exceeded', async () => {
    const server = app.getHttpServer()

    // limit: 3 → first 3 succeed, 4th throttles
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const okResponse = await request(server).post('/rl-test/strict').send({ attempt })
      expect(okResponse.status).toBe(201)
    }

    const throttledResponse = await request(server).post('/rl-test/strict').send({ attempt: 4 })
    expect(throttledResponse.status).toBe(429)
  })

  it('never throttles a @SkipThrottle endpoint no matter how many requests come in', async () => {
    const server = app.getHttpServer()

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(server).post('/rl-test/unlimited').send({ attempt })
      expect(response.status).toBe(201)
    }
  })
})

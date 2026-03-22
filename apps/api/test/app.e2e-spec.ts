import { Test, type TestingModule } from '@nestjs/testing'
import { type INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'

describe('AppController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/health', () => {
    it('returns 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((response) => {
          expect(response.body.status).toBe('ok')
          expect(typeof response.body.timestamp).toBe('string')
        })
    })
  })

  describe('GET /api/unknown-route', () => {
    it('returns 404 via HttpExceptionFilter with correct shape', () => {
      return request(app.getHttpServer())
        .get('/api/unknown-route')
        .expect(404)
        .expect((response) => {
          expect(response.body).toHaveProperty('statusCode', 404)
          expect(response.body).toHaveProperty('path', '/api/unknown-route')
          expect(response.body).toHaveProperty('timestamp')
        })
    })
  })
})

import { Test, type TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = module.get<AppController>(AppController)
  })

  describe('getHealthStatus', () => {
    it('returns status "ok"', () => {
      const result = appController.getHealthStatus()
      expect(result.status).toBe('ok')
    })

    it('returns a valid ISO timestamp', () => {
      const result = appController.getHealthStatus()
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })
  })
})

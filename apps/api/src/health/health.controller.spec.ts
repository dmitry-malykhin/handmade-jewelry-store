import { Test, TestingModule } from '@nestjs/testing'
import { HealthCheckService } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { PrismaService } from '../prisma/prisma.service'

const mockPrismaService = {
  $queryRaw: jest.fn(),
}

const mockHealthCheckService = {
  check: jest.fn(),
}

describe('HealthController', () => {
  let healthController: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HealthCheckService, useValue: mockHealthCheckService },
      ],
    }).compile()

    healthController = module.get<HealthController>(HealthController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('checkHealth', () => {
    it('calls HealthCheckService.check with a database indicator', async () => {
      const healthResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }
      mockHealthCheckService.check.mockResolvedValueOnce(healthResult)

      const result = await healthController.checkHealth()

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1)
      expect(result).toEqual(healthResult)
    })

    it('passes a health indicator function that queries the database', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])

      // Extract and invoke the indicator function passed to check()
      mockHealthCheckService.check.mockImplementationOnce(
        async (indicators: Array<() => Promise<unknown>>) => {
          const databaseIndicatorResult = await indicators[0]()
          return { status: 'ok', result: databaseIndicatorResult }
        },
      )

      await healthController.checkHealth()

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1)
    })

    it('database indicator returns { database: { status: "up" } } on successful query', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])

      let capturedIndicatorResult: unknown
      mockHealthCheckService.check.mockImplementationOnce(
        async (indicators: Array<() => Promise<unknown>>) => {
          capturedIndicatorResult = await indicators[0]()
          return { status: 'ok' }
        },
      )

      await healthController.checkHealth()

      expect(capturedIndicatorResult).toEqual({ database: { status: 'up' } })
    })

    it('propagates database error so HealthCheckService can return 503', async () => {
      const databaseConnectionError = new Error('Connection refused')
      mockPrismaService.$queryRaw.mockRejectedValueOnce(databaseConnectionError)

      mockHealthCheckService.check.mockImplementationOnce(
        async (indicators: Array<() => Promise<unknown>>) => {
          // HealthCheckService wraps thrown errors into a 503 response in real usage.
          // Here we verify the indicator itself throws when the DB is down.
          await expect(indicators[0]()).rejects.toThrow('Connection refused')
          return { status: 'error' }
        },
      )

      await healthController.checkHealth()
    })
  })
})

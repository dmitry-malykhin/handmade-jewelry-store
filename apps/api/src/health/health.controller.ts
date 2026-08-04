import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus'
import { SkipThrottle } from '@nestjs/throttler'
import { PrismaService } from '../prisma/prisma.service'

// UptimeRobot pings this every minute — 60 default throttler limit would eat
// alerts. Health is unauthenticated and cheap.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  checkHealth(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      // Raw SELECT 1 — the lightest possible DB connectivity check.
      // Wrap Prisma failures in HealthCheckError so terminus returns HTTP 503
      // (its documented contract); without the wrap the raw Prisma error would
      // bubble to the global exception filter and answer 500, which UptimeRobot
      // would still treat as down but obscures the real cause in logs.
      async () => {
        try {
          await this.prismaService.$queryRaw`SELECT 1`
          return { database: { status: 'up' as const } }
        } catch (error) {
          throw new HealthCheckError('Database check failed', {
            database: { status: 'down', message: (error as Error).message },
          })
        }
      },
    ])
  }
}

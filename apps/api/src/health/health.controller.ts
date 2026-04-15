import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus'
import { PrismaService } from '../prisma/prisma.service'

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
      // Returns { database: { status: 'up' } } on success.
      // Returns HTTP 503 if the query fails — UptimeRobot treats non-200 as down.
      async () => {
        await this.prismaService.$queryRaw`SELECT 1`
        return { database: { status: 'up' as const } }
      },
    ])
  }
}

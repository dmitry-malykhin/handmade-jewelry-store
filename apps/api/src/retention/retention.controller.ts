import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { DataRetentionService, type RetentionRunReport } from './retention.service'

// Admin-only manual trigger, mirrors the nightly cron. Useful for ad-hoc
// enforcement after a schema change or a compliance incident; the same
// counters surface so the report can be attached to an audit answer.
@Controller('admin/retention')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RetentionController {
  constructor(private readonly dataRetentionService: DataRetentionService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(): Promise<RetentionRunReport> {
    return this.dataRetentionService.runAll()
  }
}

import { Body, Controller, Get, Header, Patch, Res, UseGuards } from '@nestjs/common'
import type { User } from '@prisma/client'
import type { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersExportService } from './users-export.service'
import { UsersService } from './users.service'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersExportService: UsersExportService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id)
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateProfileDto)
  }

  // GDPR Art. 15 (right of access) + Art. 20 (data portability — JSON meets
  // the "structured, commonly used, machine-readable" bar). Content-Disposition
  // triggers a browser download so the caller lands on a saved file, not a tab
  // of pretty-printed JSON.
  @Get('me/export')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async exportMe(@CurrentUser() user: User, @Res({ passthrough: true }) response: Response) {
    const payload = await this.usersExportService.exportForUser(user.id)
    const filename = `senichka-data-export-${user.id}-${payload.exportedAt.slice(0, 10)}.json`
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return payload
  }
}

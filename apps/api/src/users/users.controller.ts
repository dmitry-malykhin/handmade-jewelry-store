import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id)
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateProfileDto)
  }
}

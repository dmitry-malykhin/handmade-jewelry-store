import { Module } from '@nestjs/common'
import { AdminCustomersController } from './admin-customers.controller'
import { UsersService } from './users.service'

// Note: we do NOT import AuthModule here — AuthModule already imports
// UsersModule, so the dependency direction must remain one-way. JwtAuthGuard
// and RolesGuard work via @UseGuards() because AuthModule (registered at the
// app root) makes the JWT strategy globally available through PassportModule.
@Module({
  controllers: [AdminCustomersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

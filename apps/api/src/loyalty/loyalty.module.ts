import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { LoyaltyController } from './loyalty.controller'
import { LoyaltyService } from './loyalty.service'

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  // Exported so OrdersService can hook into status transitions.
  exports: [LoyaltyService],
})
export class LoyaltyModule {}

import { Module } from '@nestjs/common'
import { AdminDiscountsController, DiscountsController } from './discounts.controller'
import { DiscountsService } from './discounts.service'

@Module({
  controllers: [DiscountsController, AdminDiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}

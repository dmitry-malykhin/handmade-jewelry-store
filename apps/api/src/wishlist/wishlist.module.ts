import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../email/email.module'
import { BackInStockService } from './back-in-stock.service'
import { WishlistController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [WishlistController],
  providers: [WishlistService, BackInStockService],
  exports: [WishlistService, BackInStockService],
})
export class WishlistModule {}

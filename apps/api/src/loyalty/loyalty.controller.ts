import { Controller, Get, UseGuards } from '@nestjs/common'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { LoyaltyService } from './loyalty.service'

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.loyaltyService.getBalance(user.id)
  }

  @Get('transactions')
  listTransactions(@CurrentUser() user: User) {
    return this.loyaltyService.listTransactions(user.id)
  }
}

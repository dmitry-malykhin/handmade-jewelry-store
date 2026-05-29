import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { PurchaseLabelDto } from './dto/purchase-label.dto'
import { ShippingService } from './shipping.service'

@Controller('admin/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  getStatus() {
    return this.shippingService.getStatus()
  }

  @Post('orders/:orderId/label')
  @HttpCode(HttpStatus.OK)
  purchaseLabel(@Param('orderId') orderId: string, @Body() purchaseLabelDto: PurchaseLabelDto) {
    return this.shippingService.purchaseLabel({
      orderId,
      carrier: purchaseLabelDto.carrier,
      insuranceCents: purchaseLabelDto.insuranceCents,
    })
  }
}

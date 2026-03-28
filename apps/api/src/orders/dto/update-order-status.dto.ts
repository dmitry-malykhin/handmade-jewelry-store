import { OrderStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus

  @IsString()
  @IsOptional()
  note?: string

  @IsString()
  @IsOptional()
  trackingNumber?: string
}

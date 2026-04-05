import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateOrderTrackingDto {
  @IsString()
  @MaxLength(100)
  trackingNumber: string

  @IsString()
  @MaxLength(50)
  shippingCarrier: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string
}

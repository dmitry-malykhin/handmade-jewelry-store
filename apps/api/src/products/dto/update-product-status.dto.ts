import { ProductStatus } from '@prisma/client'
import { IsEnum, IsNotEmpty } from 'class-validator'

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus
}

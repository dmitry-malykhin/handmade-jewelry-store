import { OrderStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class OrderQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus

  @IsString()
  @IsOptional()
  userId?: string
}

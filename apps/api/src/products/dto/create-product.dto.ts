import { StockType } from '@prisma/client'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number

  @IsInt()
  @Min(0)
  @Max(1, { message: 'Each handmade piece is unique — stock can only be 0 or 1' })
  stock: number

  @IsArray()
  @IsString({ each: true })
  images: string[]

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsString()
  @IsNotEmpty()
  categoryId: string

  @IsString()
  @IsOptional()
  sku?: string

  @IsNumber()
  @IsPositive()
  @IsOptional()
  weight?: number

  @IsString()
  @IsOptional()
  material?: string

  @IsEnum(StockType)
  @IsOptional()
  stockType?: StockType

  @IsInt()
  @Min(0)
  @IsOptional()
  productionDays?: number

  // Dimensions — stored in metric (docs/10_MEASUREMENT_SYSTEMS.md)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  lengthCm?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  widthCm?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  heightCm?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  diameterCm?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  weightGrams?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  beadSizeMm?: number
}

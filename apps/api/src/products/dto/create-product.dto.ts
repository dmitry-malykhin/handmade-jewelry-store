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
  ValidateIf,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator'

// Issue #231 — handmade has no permanent sold-out state. When a product is
// not currently in stock (stock=0), the master must commit to a production
// lead time so the customer knows what they're waiting for.
function ProductionDaysRequiredWhenOutOfStock(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'productionDaysRequiredWhenOutOfStock',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args?: ValidationArguments) {
          const dto = (args?.object ?? {}) as { stock?: number }
          // Only enforce the rule when stock is explicitly 0. For stock=1 (or absent),
          // productionDays may be 0 (item ships from stock immediately).
          if (dto.stock !== 0) return true
          return typeof value === 'number' && value >= 1
        },
        defaultMessage() {
          return 'Production days must be at least 1 when the product is made on order (stock = 0)'
        },
      },
    })
  }
}

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

  // Optional only when stock = 1. When stock = 0 the field is required and
  // must be >= 1 — see ProductionDaysRequiredWhenOutOfStock.
  @ValidateIf(
    (dto: { stock?: number; productionDays?: number }) =>
      dto.stock === 0 || dto.productionDays !== undefined,
  )
  @IsInt()
  @Min(0)
  @ProductionDaysRequiredWhenOutOfStock()
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

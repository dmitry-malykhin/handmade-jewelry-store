import { Type } from 'class-transformer'
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  registerDecorator,
  ValidateNested,
  type ValidationOptions,
} from 'class-validator'

// Handmade business rule — each piece is unique, you can never order
// two of the same product in the same order. Custom decorator runs on
// the items[] array of CreateOrderDto and rejects any duplicates.
function HasUniqueProductIds(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'hasUniqueProductIds',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return false
          const productIds = value
            .map((orderItem: { productId?: unknown }) => orderItem?.productId)
            .filter((productId): productId is string => typeof productId === 'string')
          return new Set(productIds).size === productIds.length
        },
        defaultMessage() {
          return 'Each handmade piece is unique — you cannot order the same product twice in one order'
        },
      },
    })
  }
}

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string

  @IsInt()
  @Min(1)
  @Max(1, { message: 'Each handmade piece is unique — quantity per line item must be 1' })
  quantity: number

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number

  /**
   * Snapshot of product data captured at purchase time.
   * Stored so the order remains accurate even if the product is later edited or deleted.
   */
  @IsObject()
  productSnapshot: {
    title: string
    slug: string
    sku?: string
    image?: string
  }
}

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsString()
  @IsNotEmpty()
  addressLine1: string

  @IsString()
  @IsOptional()
  addressLine2?: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsString()
  @IsOptional()
  state?: string

  @IsString()
  @IsNotEmpty()
  postalCode: string

  @IsString()
  @IsNotEmpty()
  country: string

  @IsString()
  @IsOptional()
  phone?: string
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  userId?: string

  @IsEmail()
  @IsOptional()
  guestEmail?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @HasUniqueProductIds()
  items: OrderItemDto[]

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal: number

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost: number

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number

  @IsString()
  @IsOptional()
  source?: string
}

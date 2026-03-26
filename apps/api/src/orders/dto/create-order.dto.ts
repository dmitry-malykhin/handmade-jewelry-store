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
  Min,
  ValidateNested,
} from 'class-validator'

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string

  @IsInt()
  @Min(1)
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

import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator'

export enum ProductSortField {
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  AVG_RATING = 'avgRating',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ProductQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20

  @IsString()
  @IsOptional()
  categorySlug?: string

  @IsString()
  @IsOptional()
  search?: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  minPrice?: number

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  maxPrice?: number

  @IsString()
  @IsOptional()
  material?: string

  @IsEnum(ProductSortField)
  @IsOptional()
  sortBy?: ProductSortField = ProductSortField.CREATED_AT

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC
}

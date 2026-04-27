import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpsertAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  addressLine1!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

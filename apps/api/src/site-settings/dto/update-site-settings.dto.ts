import { Type } from 'class-transformer'
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

/**
 * Partial update — every field is optional so the frontend can save one
 * section ("General", "Social", "Shipping & Returns") at a time without
 * having to send the full object.
 *
 * Empty strings for email fields are allowed (admin clears the field);
 * URL fields use ValidateIf to skip URL validation when blank/null so the
 * "I cleared this social link" path doesn't 400.
 */
export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string

  @ValidateIf((_, value) => value !== '' && value !== null)
  @IsOptional()
  @IsEmail()
  contactEmail?: string

  @ValidateIf((_, value) => value !== '' && value !== null)
  @IsOptional()
  @IsEmail()
  supportEmail?: string

  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  instagramUrl?: string | null

  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  pinterestUrl?: string | null

  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  facebookUrl?: string | null

  @ValidateIf((_, value) => value !== '' && value !== null && value !== undefined)
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  tiktokUrl?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  returnPolicyDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedDeliveryMinDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  estimatedDeliveryMaxDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeShippingThresholdCents?: number
}

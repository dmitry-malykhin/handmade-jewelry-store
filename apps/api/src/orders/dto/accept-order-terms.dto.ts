import { IsString, MaxLength, MinLength } from 'class-validator'

export class AcceptOrderTermsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  termsVersion!: string

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  privacyVersion!: string

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  refundPolicyVersion!: string
}

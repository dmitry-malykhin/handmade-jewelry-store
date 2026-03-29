import { Transform } from 'class-transformer'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  // Trim whitespace before validation — prevents " user@test.com " creating duplicate accounts
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  // RFC 5321 limits email to 254 characters
  @MaxLength(254)
  email: string

  @IsString()
  // Trim before length check — prevents passwords made entirely of whitespace
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(8)
  // bcrypt silently truncates passwords longer than 72 characters
  @MaxLength(72)
  password: string
}

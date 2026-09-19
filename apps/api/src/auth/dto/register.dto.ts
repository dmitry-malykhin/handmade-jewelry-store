import { Transform } from 'class-transformer'
import { Equals, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'

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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string

  // GDPR Art. 7(1): evidenced consent required before processing.
  @Equals(true, { message: 'You must accept the Terms of Service and Privacy Policy' })
  termsAccepted: boolean
}

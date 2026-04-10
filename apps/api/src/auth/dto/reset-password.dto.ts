import { IsString, Matches, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @IsString()
  token!: string

  @IsString()
  @MinLength(8)
  // Require at least one lowercase letter, one uppercase letter, and one digit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string
}

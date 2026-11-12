import { IsString, MinLength } from 'class-validator'

export class DeleteSelfAccountDto {
  // Current password for reauth (#642 bars XSS from one-shotting erasure).
  @IsString()
  @MinLength(1)
  password!: string

  // Exact-match confirmation phrase, compared against
  // DELETE_ACCOUNT_CONFIRMATION_PHRASE in UsersService.
  @IsString()
  @MinLength(1)
  confirmationPhrase!: string
}

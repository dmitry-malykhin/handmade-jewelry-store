import { IsString, Length } from 'class-validator'

export class VerifyEmailDto {
  @IsString()
  @Length(1, 200)
  token!: string
}

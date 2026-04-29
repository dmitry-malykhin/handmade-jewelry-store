import { IsEmail, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class SubscribeNewsletterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string
}

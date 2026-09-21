import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class SubscribeNewsletterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsBoolean()
  @Equals(true, {
    message: 'You must accept the newsletter consent statement.',
  })
  consent!: boolean

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sourceUrl?: string
}

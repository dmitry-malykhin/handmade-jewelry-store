import { IsEmail, IsEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class SendContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsEmail()
  @MaxLength(254)
  email: string

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  subject: string

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string

  // Honeypot — @IsEmpty rejects (400) any non-empty value; real users never see it.
  @IsOptional()
  @IsEmpty()
  website?: string
}

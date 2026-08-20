import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (e.g. sterling-silver)',
  })
  @MaxLength(100)
  slug?: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string
}

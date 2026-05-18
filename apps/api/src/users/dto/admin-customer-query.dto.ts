import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class AdminCustomerQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20

  /**
   * Free-text match against email (case-insensitive). Email is the only
   * customer identifier the project stores — there's no name field on User.
   */
  @IsString()
  @IsOptional()
  search?: string
}

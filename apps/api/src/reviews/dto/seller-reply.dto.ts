import { IsString, MaxLength, MinLength } from 'class-validator'

export class SellerReplyDto {
  /**
   * Public seller reply text. Cap at 2000 chars — long enough for context,
   * short enough to render inline without a "Show more" affordance.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reply!: string
}

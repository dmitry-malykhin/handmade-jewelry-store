import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator'

export class MergeWishlistDto {
  // Caps the merge payload to a sensible upper bound — a guest user shouldn't
  // arrive with thousands of items; this also blocks abuse via the public endpoint.
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  productIds!: string[]
}

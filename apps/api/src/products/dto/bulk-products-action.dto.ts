import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator'

export enum BulkProductAction {
  PUBLISH = 'publish',
  DRAFT = 'draft',
  DELETE = 'delete',
}

/**
 * Hard cap on batch size — prevents a runaway request from blocking the
 * connection pool. 100 is well above the natural page size (20) and below
 * anything that would warrant a streamed/queued workflow.
 */
const MAX_BULK_SIZE = 100

export class BulkProductsActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @IsString({ each: true })
  ids!: string[]

  @IsEnum(BulkProductAction)
  action!: BulkProductAction
}

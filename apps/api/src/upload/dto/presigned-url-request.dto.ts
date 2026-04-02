import { IsIn, IsString, Matches } from 'class-validator'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageContentType = (typeof ALLOWED_CONTENT_TYPES)[number]

export class PresignedUrlRequestDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'fileName must contain only alphanumeric characters, dots, underscores, or hyphens',
  })
  fileName: string

  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
  })
  contentType: AllowedImageContentType
}

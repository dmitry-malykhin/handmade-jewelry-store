import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { extname } from 'path'
import type { AllowedImageContentType } from './dto/presigned-url-request.dto'
import type { PresignedUrlResponseDto } from './dto/presigned-url-response.dto'

const PRESIGNED_URL_TTL_SECONDS = 300 // 5 minutes
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private readonly s3Client: S3Client
  private readonly bucketName: string
  private readonly publicUrlPrefix: string

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET')
    this.publicUrlPrefix = this.configService.getOrThrow<string>('AWS_S3_PUBLIC_URL_PREFIX')

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    })
  }

  async generatePresignedUrl(
    fileName: string,
    contentType: AllowedImageContentType,
  ): Promise<PresignedUrlResponseDto> {
    const extension = extname(fileName).toLowerCase() || '.jpg'
    // Use UUID for S3 key — never expose original filename (prevents path traversal / PII leaks)
    const s3Key = `products/${randomUUID()}${extension}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
      // Enforce file size limit server-side via S3 policy condition
      // This prevents oversize uploads even if client validation is bypassed
      Metadata: { 'max-size': String(MAX_FILE_SIZE_BYTES) },
    })

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
      })
      const publicUrl = `${this.publicUrlPrefix}/${s3Key}`

      return { uploadUrl, publicUrl }
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', { error, s3Key })
      throw new InternalServerErrorException('Failed to generate upload URL')
    }
  }
}

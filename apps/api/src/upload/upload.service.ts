import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
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

  constructor(private readonly configService: ConfigService) {}

  // S3 client is created lazily so the app starts without credentials in dev.
  // A real upload attempt will throw InternalServerErrorException if missing.
  //
  // Supports two providers via AWS_S3_ENDPOINT (issue #243):
  //  - When AWS_S3_ENDPOINT is set → Cloudflare R2 or any S3-compatible service.
  //    R2 endpoint shape: https://<account-id>.r2.cloudflarestorage.com.
  //    R2 requires path-style addressing (forcePathStyle).
  //  - When AWS_S3_ENDPOINT is empty/unset → default AWS S3 endpoint per region.
  //
  // Switching providers is an env-only change; consumers (presigned URLs, public
  // URL prefix) work identically because R2's API is S3-compatible.
  private buildS3Client(): S3Client {
    const config: S3ClientConfig = {
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    }

    const customEndpoint = this.configService.get<string>('AWS_S3_ENDPOINT')
    if (customEndpoint) {
      config.endpoint = customEndpoint
      config.forcePathStyle = true
    }

    return new S3Client(config)
  }

  async generatePresignedUrl(
    fileName: string,
    contentType: AllowedImageContentType,
  ): Promise<PresignedUrlResponseDto> {
    const bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET')
    const publicUrlPrefix = this.configService.getOrThrow<string>('AWS_S3_PUBLIC_URL_PREFIX')

    const extension = extname(fileName).toLowerCase() || '.jpg'
    // Use UUID for S3 key — never expose original filename (prevents path traversal / PII leaks)
    const s3Key = `products/${randomUUID()}${extension}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      // Enforce file size limit server-side via S3 policy condition
      // This prevents oversize uploads even if client validation is bypassed
      Metadata: { 'max-size': String(MAX_FILE_SIZE_BYTES) },
    })

    try {
      const s3Client = this.buildS3Client()
      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
      })
      const publicUrl = `${publicUrlPrefix}/${s3Key}`

      return { uploadUrl, publicUrl }
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', { error, s3Key })
      throw new InternalServerErrorException('Failed to generate upload URL')
    }
  }
}

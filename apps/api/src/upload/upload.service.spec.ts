import { InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UploadService } from './upload.service'

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}))

const mockGetSignedUrl = jest.mocked(getSignedUrl)
const mockS3Client = jest.mocked(S3Client)

// Default AWS S3 config (no custom endpoint).
const defaultConfigMap: Record<string, string> = {
  AWS_S3_BUCKET: 'test-bucket',
  AWS_S3_PUBLIC_URL_PREFIX: 'https://test-bucket.s3.us-east-1.amazonaws.com',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-key-id',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
}

function buildMockConfigService(extraConfig: Record<string, string> = {}) {
  const configMap = { ...defaultConfigMap, ...extraConfig }
  return {
    getOrThrow: jest.fn((key: string) => {
      const value = configMap[key]
      if (value === undefined) throw new Error(`Config key not set: ${key}`)
      return value
    }),
    get: jest.fn((key: string) => configMap[key]),
  }
}

async function buildUploadService(extraConfig: Record<string, string> = {}) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UploadService,
      { provide: ConfigService, useValue: buildMockConfigService(extraConfig) },
    ],
  }).compile()
  return module.get<UploadService>(UploadService)
}

describe('UploadService', () => {
  let uploadService: UploadService

  beforeEach(async () => {
    uploadService = await buildUploadService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generatePresignedUrl', () => {
    it('returns uploadUrl and publicUrl with correct s3 key format', async () => {
      const mockSignedUrl =
        'https://test-bucket.s3.amazonaws.com/products/uuid.jpg?X-Amz-Signature=abc'
      mockGetSignedUrl.mockResolvedValue(mockSignedUrl)

      const result = await uploadService.generatePresignedUrl('photo.jpg', 'image/jpeg')

      expect(result.uploadUrl).toBe(mockSignedUrl)
      // publicUrl must follow products/{uuid}.{ext} pattern
      expect(result.publicUrl).toMatch(
        /^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/products\/[a-f0-9-]{36}\.jpg$/,
      )
    })

    it('uses original file extension in the s3 key', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url')

      const result = await uploadService.generatePresignedUrl('banner.png', 'image/png')

      expect(result.publicUrl).toMatch(/\.png$/)
    })

    it('throws InternalServerErrorException when getSignedUrl fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('AWS credentials invalid'))

      await expect(uploadService.generatePresignedUrl('photo.jpg', 'image/jpeg')).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  // Issue #243 — S3-compatible providers (Cloudflare R2) via AWS_S3_ENDPOINT.
  describe('S3 provider configuration', () => {
    it('omits endpoint when AWS_S3_ENDPOINT is unset (default AWS S3)', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url')

      await uploadService.generatePresignedUrl('photo.jpg', 'image/jpeg')

      const passedConfig = mockS3Client.mock.calls[0]?.[0]
      expect(passedConfig?.endpoint).toBeUndefined()
      expect(passedConfig?.forcePathStyle).toBeUndefined()
    })

    it('passes custom endpoint + forcePathStyle when AWS_S3_ENDPOINT is set (R2)', async () => {
      const r2Service = await buildUploadService({
        AWS_S3_ENDPOINT: 'https://abcdef.r2.cloudflarestorage.com',
      })
      mockGetSignedUrl.mockResolvedValue('https://signed-url')

      await r2Service.generatePresignedUrl('photo.jpg', 'image/jpeg')

      const passedConfig = mockS3Client.mock.calls.at(-1)?.[0]
      expect(passedConfig?.endpoint).toBe('https://abcdef.r2.cloudflarestorage.com')
      expect(passedConfig?.forcePathStyle).toBe(true)
    })
  })
})

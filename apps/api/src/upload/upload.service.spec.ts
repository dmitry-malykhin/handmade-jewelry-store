import { InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
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

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const configMap: Record<string, string> = {
      AWS_S3_BUCKET: 'test-bucket',
      AWS_S3_PUBLIC_URL_PREFIX: 'https://test-bucket.s3.us-east-1.amazonaws.com',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test-key-id',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
    }
    return configMap[key]
  }),
}

describe('UploadService', () => {
  let uploadService: UploadService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile()

    uploadService = module.get<UploadService>(UploadService)
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
})

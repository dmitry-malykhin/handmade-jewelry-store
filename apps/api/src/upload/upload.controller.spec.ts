import { Test, TestingModule } from '@nestjs/testing'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

const mockPresignedUrlResponse = {
  uploadUrl: 'https://bucket.s3.amazonaws.com/products/uuid.jpg?X-Amz-Signature=abc',
  publicUrl: 'https://bucket.s3.amazonaws.com/products/uuid.jpg',
}

const mockUploadService = {
  generatePresignedUrl: jest.fn(),
}

describe('UploadController', () => {
  let uploadController: UploadController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadService }],
    }).compile()

    uploadController = module.get<UploadController>(UploadController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generatePresignedUrl', () => {
    it('returns uploadUrl and publicUrl for valid jpeg request', async () => {
      mockUploadService.generatePresignedUrl.mockResolvedValue(mockPresignedUrlResponse)

      const result = await uploadController.generatePresignedUrl({
        fileName: 'ring.jpg',
        contentType: 'image/jpeg',
      })

      expect(result).toEqual(mockPresignedUrlResponse)
      expect(mockUploadService.generatePresignedUrl).toHaveBeenCalledWith('ring.jpg', 'image/jpeg')
    })

    it('returns uploadUrl and publicUrl for valid webp request', async () => {
      mockUploadService.generatePresignedUrl.mockResolvedValue(mockPresignedUrlResponse)

      await uploadController.generatePresignedUrl({
        fileName: 'necklace.webp',
        contentType: 'image/webp',
      })

      expect(mockUploadService.generatePresignedUrl).toHaveBeenCalledWith(
        'necklace.webp',
        'image/webp',
      )
    })

    it('propagates InternalServerErrorException when service throws', async () => {
      mockUploadService.generatePresignedUrl.mockRejectedValue(
        new Error('Failed to generate upload URL'),
      )

      await expect(
        uploadController.generatePresignedUrl({ fileName: 'ring.jpg', contentType: 'image/jpeg' }),
      ).rejects.toThrow('Failed to generate upload URL')
    })
  })
})

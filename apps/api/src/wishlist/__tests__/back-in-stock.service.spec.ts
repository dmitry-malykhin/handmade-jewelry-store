import { Test, TestingModule } from '@nestjs/testing'
import { EmailService } from '../../email/email.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BackInStockService } from '../back-in-stock.service'

const mockPrismaService = {
  product: { findUnique: jest.fn() },
  wishlist: { findMany: jest.fn() },
}

const mockEmailService = {
  sendBackInStock: jest.fn(),
}

describe('BackInStockService', () => {
  let service: BackInStockService

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BackInStockService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()
    service = moduleRef.get(BackInStockService)
  })

  it('logs and exits without sending when product is unknown', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue(null)

    await service.notifyForProduct('missing')

    expect(mockEmailService.sendBackInStock).not.toHaveBeenCalled()
  })

  it('exits without sending when no users have wishlisted the product', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Ring',
      slug: 'ring',
      images: ['img.jpg'],
    })
    mockPrismaService.wishlist.findMany.mockResolvedValue([])

    await service.notifyForProduct('p1')

    expect(mockEmailService.sendBackInStock).not.toHaveBeenCalled()
  })

  it('sends one email per wishlist subscriber with the product image', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Silver Ring',
      slug: 'silver-ring',
      images: ['https://cdn.example/ring.jpg'],
    })
    mockPrismaService.wishlist.findMany.mockResolvedValue([
      { user: { email: 'jane@example.com' } },
      { user: { email: 'john@example.com' } },
    ])
    mockEmailService.sendBackInStock.mockResolvedValue(undefined)

    await service.notifyForProduct('p1')

    expect(mockEmailService.sendBackInStock).toHaveBeenCalledTimes(2)
    expect(mockEmailService.sendBackInStock).toHaveBeenCalledWith({
      recipientEmail: 'jane@example.com',
      productTitle: 'Silver Ring',
      productSlug: 'silver-ring',
      productImageUrl: 'https://cdn.example/ring.jpg',
    })
    expect(mockEmailService.sendBackInStock).toHaveBeenCalledWith({
      recipientEmail: 'john@example.com',
      productTitle: 'Silver Ring',
      productSlug: 'silver-ring',
      productImageUrl: 'https://cdn.example/ring.jpg',
    })
  })

  it('omits productImageUrl when product has no images', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Ring',
      slug: 'ring',
      images: [],
    })
    mockPrismaService.wishlist.findMany.mockResolvedValue([{ user: { email: 'jane@example.com' } }])

    await service.notifyForProduct('p1')

    expect(mockEmailService.sendBackInStock).toHaveBeenCalledWith({
      recipientEmail: 'jane@example.com',
      productTitle: 'Ring',
      productSlug: 'ring',
    })
  })

  it('continues sending to remaining recipients when one email fails', async () => {
    mockPrismaService.product.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Ring',
      slug: 'ring',
      images: ['img.jpg'],
    })
    mockPrismaService.wishlist.findMany.mockResolvedValue([
      { user: { email: 'broken@example.com' } },
      { user: { email: 'good@example.com' } },
    ])
    mockEmailService.sendBackInStock
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValueOnce(undefined)

    await expect(service.notifyForProduct('p1')).resolves.toBeUndefined()
    expect(mockEmailService.sendBackInStock).toHaveBeenCalledTimes(2)
  })
})

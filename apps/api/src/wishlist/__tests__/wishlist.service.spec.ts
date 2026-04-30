import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service'
import { WishlistService } from '../wishlist.service'

const mockPrismaService = {
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  wishlist: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
}

describe('WishlistService', () => {
  let service: WishlistService

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [WishlistService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()
    service = moduleRef.get(WishlistService)
  })

  describe('getWishlist', () => {
    it('returns products for an existing wishlist, ordered desc by createdAt', async () => {
      const products = [{ id: 'p1' }, { id: 'p2' }]
      mockPrismaService.wishlist.findUnique.mockResolvedValue({ products })

      const result = await service.getWishlist('u1')

      expect(result).toBe(products)
      expect(mockPrismaService.wishlist.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { products: { orderBy: { createdAt: 'desc' } } },
      })
    })

    it('returns empty array when user has no wishlist row yet', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null)
      await expect(service.getWishlist('u1')).resolves.toEqual([])
    })
  })

  describe('addToWishlist', () => {
    it('throws NotFound when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(service.addToWishlist('u1', 'missing')).rejects.toThrow(NotFoundException)
      expect(mockPrismaService.wishlist.upsert).not.toHaveBeenCalled()
    })

    it('upserts the wishlist and connects the product when it exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'p1' })
      mockPrismaService.wishlist.upsert.mockResolvedValue({})

      const result = await service.addToWishlist('u1', 'p1')

      expect(result).toEqual({ added: true })
      expect(mockPrismaService.wishlist.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', products: { connect: { id: 'p1' } } },
        update: { products: { connect: { id: 'p1' } } },
      })
    })
  })

  describe('removeFromWishlist', () => {
    it('returns success without writes when user has no wishlist row', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null)

      const result = await service.removeFromWishlist('u1', 'p1')

      expect(result).toEqual({ removed: true })
      expect(mockPrismaService.wishlist.update).not.toHaveBeenCalled()
    })

    it('disconnects the product when wishlist exists', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue({ id: 'w1' })
      mockPrismaService.wishlist.update.mockResolvedValue({})

      const result = await service.removeFromWishlist('u1', 'p1')

      expect(result).toEqual({ removed: true })
      expect(mockPrismaService.wishlist.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { products: { disconnect: { id: 'p1' } } },
      })
    })
  })

  describe('mergeGuestWishlist', () => {
    it('skips DB writes and returns current list when payload is empty', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue({ products: [] })

      await service.mergeGuestWishlist('u1', [])

      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled()
      expect(mockPrismaService.wishlist.upsert).not.toHaveBeenCalled()
    })

    it('silently drops product ids that no longer exist', async () => {
      // Caller sends 3 ids; DB knows about 2. The third is silently dropped — no error.
      mockPrismaService.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
      mockPrismaService.wishlist.upsert.mockResolvedValue({})
      mockPrismaService.wishlist.findUnique.mockResolvedValue({
        products: [{ id: 'p1' }, { id: 'p2' }],
      })

      const result = await service.mergeGuestWishlist('u1', ['p1', 'p2', 'deleted'])

      expect(mockPrismaService.wishlist.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', products: { connect: [{ id: 'p1' }, { id: 'p2' }] } },
        update: { products: { connect: [{ id: 'p1' }, { id: 'p2' }] } },
      })
      expect(result).toEqual([{ id: 'p1' }, { id: 'p2' }])
    })

    it('skips upsert if all incoming ids are unknown', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.wishlist.findUnique.mockResolvedValue({ products: [] })

      await service.mergeGuestWishlist('u1', ['ghost1', 'ghost2'])

      expect(mockPrismaService.wishlist.upsert).not.toHaveBeenCalled()
    })
  })

  describe('findUsersWishlistingProduct', () => {
    it('returns userIds of wishlists containing the product', async () => {
      mockPrismaService.wishlist.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }])

      const result = await service.findUsersWishlistingProduct('p1')

      expect(result).toEqual(['u1', 'u2'])
      expect(mockPrismaService.wishlist.findMany).toHaveBeenCalledWith({
        where: { products: { some: { id: 'p1' } } },
        select: { userId: true },
      })
    })
  })
})

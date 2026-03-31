import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AdminProductQueryDto } from './dto/admin-product-query.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductQueryDto, ProductSortField, SortOrder } from './dto/product-query.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

const mockProduct = {
  id: 'prod-1',
  slug: 'silver-ring',
  title: 'Silver Ring',
  description: 'A nice ring',
  price: 68.0,
  stock: 5,
  images: [],
  sku: 'RING-001',
  weight: 4.2,
  material: 'Sterling Silver',
  avgRating: 0,
  reviewCount: 0,
  stockType: 'IN_STOCK',
  productionDays: 0,
  lengthCm: null,
  widthCm: 0.6,
  heightCm: 1.2,
  diameterCm: null,
  weightGrams: 4.2,
  beadSizeMm: null,
  categoryId: 'cat-1',
  category: { name: 'Rings', slug: 'rings' },
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPrismaService = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
}

describe('ProductsService', () => {
  let productsService: ProductsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    productsService = module.get<ProductsService>(ProductsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns paginated products with meta', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct])
      mockPrismaService.product.count.mockResolvedValue(1)

      const productQueryDto: ProductQueryDto = { page: 1, limit: 20 }
      const result = await productsService.findAll(productQueryDto)

      expect(result.data).toHaveLength(1)
      expect(result.meta).toEqual({
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
    })

    it('filters by categorySlug when provided', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct])
      mockPrismaService.product.count.mockResolvedValue(1)

      await productsService.findAll({ categorySlug: 'rings', page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where).toMatchObject({ category: { slug: 'rings' } })
    })

    it('applies case-insensitive search across title and description', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ search: 'moonstone', page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: { contains: 'moonstone', mode: 'insensitive' } }),
          expect.objectContaining({
            description: { contains: 'moonstone', mode: 'insensitive' },
          }),
        ]),
      )
    })

    it('calculates correct skip offset for pagination', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ page: 3, limit: 10 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.skip).toBe(20) // (3 - 1) * 10
      expect(findManyCall.take).toBe(10)
    })

    it('filters by price range when minPrice and maxPrice are provided', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ minPrice: 20, maxPrice: 80, page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.price).toEqual({ gte: 20, lte: 80 })
    })

    it('filters by minPrice only when maxPrice is omitted', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ minPrice: 50, page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.price).toEqual({ gte: 50 })
      expect(findManyCall.where.price.lte).toBeUndefined()
    })

    it('filters by material case-insensitively', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ material: 'silver', page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.material).toEqual({ contains: 'silver', mode: 'insensitive' })
    })

    it('sorts by price ascending when sortBy and sortOrder are specified', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({
        sortBy: ProductSortField.PRICE,
        sortOrder: SortOrder.ASC,
        page: 1,
        limit: 20,
      })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.orderBy).toEqual({ price: 'asc' })
    })

    it('defaults to sorting by createdAt descending', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAll({ page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.orderBy).toEqual({ createdAt: 'desc' })
    })
  })

  describe('findOneBySlug', () => {
    it('returns the product when slug exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct)

      const result = await productsService.findOneBySlug('silver-ring')

      expect(result).toEqual(mockProduct)
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'silver-ring' } }),
      )
    })

    it('throws NotFoundException when slug does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(productsService.findOneBySlug('unknown-slug')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates and returns a product with category included', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct)

      const createProductDto: CreateProductDto = {
        title: 'Silver Ring',
        description: 'A nice ring',
        price: 68.0,
        stock: 5,
        images: [],
        slug: 'silver-ring',
        categoryId: 'cat-1',
      }

      const result = await productsService.create(createProductDto)

      expect(result).toEqual(mockProduct)
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: createProductDto,
          include: { category: { select: { name: true, slug: true } } },
        }),
      )
    })
  })

  describe('update', () => {
    it('updates the product when slug exists', async () => {
      const updatedProduct = { ...mockProduct, title: 'Updated Ring' }
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct)
      mockPrismaService.product.update.mockResolvedValue(updatedProduct)

      const updateProductDto: UpdateProductDto = { title: 'Updated Ring' }
      const result = await productsService.update('silver-ring', updateProductDto)

      expect(result.title).toBe('Updated Ring')
      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'silver-ring' }, data: updateProductDto }),
      )
    })

    it('throws NotFoundException when updating a non-existent slug', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(productsService.update('unknown-slug', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('remove', () => {
    it('deletes the product when slug exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct)
      mockPrismaService.product.delete.mockResolvedValue(mockProduct)

      await productsService.remove('silver-ring')

      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { slug: 'silver-ring' },
      })
    })

    it('throws NotFoundException when deleting a non-existent slug', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(productsService.remove('unknown-slug')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAllAdmin', () => {
    it('returns paginated products without status filter when status is omitted', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct])
      mockPrismaService.product.count.mockResolvedValue(1)

      const adminQueryDto: AdminProductQueryDto = { page: 1, limit: 20 }
      const result = await productsService.findAllAdmin(adminQueryDto)

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalCount).toBe(1)
      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBeUndefined()
    })

    it('filters by status when status is provided', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAllAdmin({ status: ProductStatus.DRAFT, page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe(ProductStatus.DRAFT)
    })

    it('searches by title and SKU case-insensitively', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([])
      mockPrismaService.product.count.mockResolvedValue(0)

      await productsService.findAllAdmin({ search: 'ring', page: 1, limit: 20 })

      const findManyCall = mockPrismaService.product.findMany.mock.calls[0][0]
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: { contains: 'ring', mode: 'insensitive' } }),
          expect.objectContaining({ sku: { contains: 'ring', mode: 'insensitive' } }),
        ]),
      )
    })
  })

  describe('updateStatus', () => {
    it('updates product status when product exists', async () => {
      const updatedProduct = {
        id: 'prod-1',
        slug: 'silver-ring',
        title: 'Silver Ring',
        status: ProductStatus.ARCHIVED,
      }
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct)
      mockPrismaService.product.update.mockResolvedValue(updatedProduct)

      const result = await productsService.updateStatus('prod-1', ProductStatus.ARCHIVED)

      expect(result.status).toBe(ProductStatus.ARCHIVED)
      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { status: ProductStatus.ARCHIVED },
        }),
      )
    })

    it('throws NotFoundException when product id does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null)

      await expect(
        productsService.updateStatus('nonexistent-id', ProductStatus.ACTIVE),
      ).rejects.toThrow(NotFoundException)
    })
  })
})

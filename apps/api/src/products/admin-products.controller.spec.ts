import { Test, TestingModule } from '@nestjs/testing'
import { ProductStatus } from '@prisma/client'
import { AdminProductQueryDto } from './dto/admin-product-query.dto'
import { AdminProductsController } from './admin-products.controller'
import { ProductsService } from './products.service'

const mockProductsResponse = {
  data: [
    {
      id: 'prod-1',
      slug: 'silver-ring',
      title: 'Silver Ring',
      status: ProductStatus.ACTIVE,
      price: 68.0,
      stock: 5,
    },
  ],
  meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
}

const mockProductsService = {
  findAllAdmin: jest.fn(),
  updateStatus: jest.fn(),
}

describe('AdminProductsController', () => {
  let adminProductsController: AdminProductsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile()

    adminProductsController = module.get<AdminProductsController>(AdminProductsController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns paginated products list from service', async () => {
      mockProductsService.findAllAdmin.mockResolvedValue(mockProductsResponse)

      const adminQueryDto: AdminProductQueryDto = { page: 1, limit: 20 }
      const result = await adminProductsController.findAll(adminQueryDto)

      expect(result).toEqual(mockProductsResponse)
      expect(mockProductsService.findAllAdmin).toHaveBeenCalledWith(adminQueryDto)
    })

    it('passes status filter to service when provided', async () => {
      mockProductsService.findAllAdmin.mockResolvedValue({ data: [], meta: { totalCount: 0 } })

      const adminQueryDto: AdminProductQueryDto = { status: ProductStatus.DRAFT }
      await adminProductsController.findAll(adminQueryDto)

      expect(mockProductsService.findAllAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.DRAFT }),
      )
    })

    it('propagates service error when findAllAdmin throws', async () => {
      mockProductsService.findAllAdmin.mockRejectedValue(new Error('Database unavailable'))

      await expect(adminProductsController.findAll({})).rejects.toThrow('Database unavailable')
    })
  })

  describe('updateStatus', () => {
    it('updates product status and returns updated product', async () => {
      const updatedProduct = {
        id: 'prod-1',
        slug: 'silver-ring',
        title: 'Silver Ring',
        status: ProductStatus.ARCHIVED,
      }
      mockProductsService.updateStatus.mockResolvedValue(updatedProduct)

      const result = await adminProductsController.updateStatus('prod-1', {
        status: ProductStatus.ARCHIVED,
      })

      expect(result).toEqual(updatedProduct)
      expect(mockProductsService.updateStatus).toHaveBeenCalledWith(
        'prod-1',
        ProductStatus.ARCHIVED,
      )
    })

    it('propagates NotFoundException when product id does not exist', async () => {
      mockProductsService.updateStatus.mockRejectedValue(new Error('Product with id "x" not found'))

      await expect(
        adminProductsController.updateStatus('x', { status: ProductStatus.ACTIVE }),
      ).rejects.toThrow('Product with id "x" not found')
    })
  })
})

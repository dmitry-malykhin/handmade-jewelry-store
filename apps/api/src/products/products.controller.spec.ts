import { Test, TestingModule } from '@nestjs/testing'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductQueryDto } from './dto/product-query.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockProductsService = {
  findAll: jest.fn(),
  findOneBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/products')
  await $allureSubSuite('products.controller')
  await $allureSeverity('normal')
})

describe('ProductsController', () => {
  let productsController: ProductsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile()

    productsController = module.get<ProductsController>(ProductsController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('delegates to ProductsService.findAll with query params', async () => {
      const paginatedResult = {
        data: [],
        meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
      }
      mockProductsService.findAll.mockResolvedValue(paginatedResult)

      const productQueryDto: ProductQueryDto = { page: 1, limit: 20 }
      const result = await productsController.findAll(productQueryDto)

      expect(mockProductsService.findAll).toHaveBeenCalledWith(productQueryDto)
      expect(result).toEqual(paginatedResult)
    })
  })

  describe('findOne', () => {
    it('delegates to ProductsService.findOneBySlug with the slug param', async () => {
      const mockProduct = { id: 'prod-1', slug: 'silver-ring' }
      mockProductsService.findOneBySlug.mockResolvedValue(mockProduct)

      const result = await productsController.findOne('silver-ring')

      expect(mockProductsService.findOneBySlug).toHaveBeenCalledWith('silver-ring')
      expect(result).toEqual(mockProduct)
    })
  })

  describe('create', () => {
    it('delegates to ProductsService.create with the DTO', async () => {
      const createProductDto: CreateProductDto = {
        title: 'Silver Ring',
        description: 'Handmade ring',
        price: 68,
        stock: 5,
        images: [],
        slug: 'silver-ring',
        categoryId: 'cat-1',
      }
      const createdProduct = { id: 'prod-1', ...createProductDto }
      mockProductsService.create.mockResolvedValue(createdProduct)

      const result = await productsController.create(createProductDto)

      expect(mockProductsService.create).toHaveBeenCalledWith(createProductDto)
      expect(result).toEqual(createdProduct)
    })
  })

  describe('update', () => {
    it('delegates to ProductsService.update with slug and DTO', async () => {
      const updateProductDto: UpdateProductDto = { title: 'Updated Ring' }
      const updatedProduct = { id: 'prod-1', slug: 'silver-ring', title: 'Updated Ring' }
      mockProductsService.update.mockResolvedValue(updatedProduct)

      const result = await productsController.update('silver-ring', updateProductDto)

      expect(mockProductsService.update).toHaveBeenCalledWith('silver-ring', updateProductDto)
      expect(result).toEqual(updatedProduct)
    })
  })

  describe('remove', () => {
    it('delegates to ProductsService.remove with the slug param', async () => {
      mockProductsService.remove.mockResolvedValue(undefined)

      await productsController.remove('silver-ring')

      expect(mockProductsService.remove).toHaveBeenCalledWith('silver-ring')
    })
  })
})

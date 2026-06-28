import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AdminInventoryController } from './admin-inventory.controller'
import { InventoryQueryDto } from './dto/inventory-query.dto'
import { ProductsService } from './products.service'

const mockService = {
  findInventory: jest.fn(),
  countLowStock: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/products')
  await $allureSubSuite('admin-inventory.controller')
  await $allureSeverity('normal')
})

describe('AdminInventoryController', () => {
  let controller: AdminInventoryController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInventoryController],
      providers: [{ provide: ProductsService, useValue: mockService }],
    }).compile()
    controller = module.get(AdminInventoryController)
    jest.clearAllMocks()
  })

  it('findInventory() forwards InventoryQueryDto to ProductsService.findInventory', async () => {
    const query: InventoryQueryDto = { threshold: 5, lowStockOnly: true }
    mockService.findInventory.mockResolvedValue({ threshold: 5, data: [] })

    const result = await controller.findInventory(query)

    expect(mockService.findInventory).toHaveBeenCalledWith(query)
    expect(result.threshold).toBe(5)
  })

  it('countLowStock() wraps the service count in a { count } object', async () => {
    mockService.countLowStock.mockResolvedValue(7)

    const result = await controller.countLowStock({ threshold: 3 })

    expect(mockService.countLowStock).toHaveBeenCalledWith(3)
    expect(result).toEqual({ count: 7 })
  })

  it('countLowStock() passes undefined threshold straight through (service applies default)', async () => {
    mockService.countLowStock.mockResolvedValue(0)

    await controller.countLowStock({})

    expect(mockService.countLowStock).toHaveBeenCalledWith(undefined)
  })
})

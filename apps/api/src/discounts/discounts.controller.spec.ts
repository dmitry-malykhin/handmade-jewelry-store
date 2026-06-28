import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AdminDiscountsController, DiscountsController } from './discounts.controller'
import { DiscountsService } from './discounts.service'
import { CreateDiscountDto } from './dto/create-discount.dto'
import { UpdateDiscountDto } from './dto/update-discount.dto'
import { ValidateDiscountDto } from './dto/validate-discount.dto'

const mockDiscountsService = {
  validate: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/discounts')
  await $allureSubSuite('discounts.controller')
  await $allureSeverity('normal')
})

describe('DiscountsController (public)', () => {
  let controller: DiscountsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountsController],
      providers: [{ provide: DiscountsService, useValue: mockDiscountsService }],
    }).compile()
    controller = module.get(DiscountsController)
    jest.clearAllMocks()
  })

  it('validate() delegates to DiscountsService.validate with the DTO', async () => {
    const dto: ValidateDiscountDto = { code: 'SUMMER10', subtotalCents: 5000 }
    const expected = { code: 'SUMMER10', type: 'PERCENTAGE', value: 10 }
    mockDiscountsService.validate.mockResolvedValue(expected)

    const result = await controller.validate(dto)

    expect(mockDiscountsService.validate).toHaveBeenCalledWith(dto)
    expect(result).toBe(expected)
  })
})

describe('AdminDiscountsController', () => {
  let controller: AdminDiscountsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDiscountsController],
      providers: [{ provide: DiscountsService, useValue: mockDiscountsService }],
    }).compile()
    controller = module.get(AdminDiscountsController)
    jest.clearAllMocks()
  })

  it('findAll() returns the service list verbatim', async () => {
    mockDiscountsService.findAll.mockResolvedValue([{ id: 'd1' }])
    const result = await controller.findAll()
    expect(result).toEqual([{ id: 'd1' }])
  })

  it('create() delegates with the CreateDiscountDto', async () => {
    const dto: CreateDiscountDto = { code: 'SUMMER10', type: 'PERCENTAGE', value: 10 }
    mockDiscountsService.create.mockResolvedValue({ id: 'd-new', ...dto })

    const result = await controller.create(dto)

    expect(mockDiscountsService.create).toHaveBeenCalledWith(dto)
    expect(result).toMatchObject({ code: 'SUMMER10' })
  })

  it('update() passes the URL param as discountId to the service', async () => {
    const dto: UpdateDiscountDto = { isActive: false }
    mockDiscountsService.update.mockResolvedValue({ id: 'd1', isActive: false })

    await controller.update('d1', dto)

    expect(mockDiscountsService.update).toHaveBeenCalledWith('d1', dto)
  })

  it('remove() delegates to DiscountsService.remove', async () => {
    mockDiscountsService.remove.mockResolvedValue(undefined)

    await controller.remove('d1')

    expect(mockDiscountsService.remove).toHaveBeenCalledWith('d1')
  })
})

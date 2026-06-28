import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AddressesController } from './addresses.controller'
import { AddressesService } from './addresses.service'
import { UpsertAddressDto } from './dto/upsert-address.dto'

const mockService = {
  findUserAddresses: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setDefault: jest.fn(),
  remove: jest.fn(),
}

const mockUser = { id: 'u1' } as User

const sampleAddressDto: UpsertAddressDto = {
  fullName: 'Jane',
  addressLine1: '1 Main',
  city: 'NY',
  postalCode: '10001',
  country: 'US',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/addresses')
  await $allureSubSuite('addresses.controller')
  await $allureSeverity('normal')
})

describe('AddressesController', () => {
  let controller: AddressesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [{ provide: AddressesService, useValue: mockService }],
    }).compile()
    controller = module.get(AddressesController)
    jest.clearAllMocks()
  })

  it('list() scopes to the current user', async () => {
    mockService.findUserAddresses.mockResolvedValue([{ id: 'a1' }])

    const result = await controller.list(mockUser)

    expect(mockService.findUserAddresses).toHaveBeenCalledWith('u1')
    expect(result).toEqual([{ id: 'a1' }])
  })

  it('create() passes userId + DTO to the service', async () => {
    mockService.create.mockResolvedValue({ id: 'a-new', ...sampleAddressDto })

    await controller.create(mockUser, sampleAddressDto)

    expect(mockService.create).toHaveBeenCalledWith('u1', sampleAddressDto)
  })

  it('update() passes (userId, addressId, dto) in the correct order', async () => {
    mockService.update.mockResolvedValue({ id: 'a1', ...sampleAddressDto })

    await controller.update(mockUser, 'a1', sampleAddressDto)

    expect(mockService.update).toHaveBeenCalledWith('u1', 'a1', sampleAddressDto)
  })

  it('setDefault() passes (userId, addressId) to the service', async () => {
    mockService.setDefault.mockResolvedValue({ id: 'a1', isDefault: true })

    await controller.setDefault(mockUser, 'a1')

    expect(mockService.setDefault).toHaveBeenCalledWith('u1', 'a1')
  })

  it('remove() passes (userId, addressId) to the service', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await controller.remove(mockUser, 'a1')

    expect(mockService.remove).toHaveBeenCalledWith('u1', 'a1')
  })
})

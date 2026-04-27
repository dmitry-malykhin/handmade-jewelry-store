import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { AddressesService } from './addresses.service'

const baseAddress = {
  id: 'addr-1',
  userId: 'user-1',
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'NYC',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
  phone: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPrismaService = {
  address: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('AddressesService', () => {
  let addressesService: AddressesService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [AddressesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    addressesService = module.get<AddressesService>(AddressesService)
  })

  describe('findUserAddresses', () => {
    it('returns addresses sorted by isDefault desc then createdAt desc', async () => {
      mockPrismaService.address.findMany.mockResolvedValue([baseAddress])

      const result = await addressesService.findUserAddresses('user-1')

      expect(mockPrismaService.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
      expect(result).toEqual([baseAddress])
    })
  })

  describe('create', () => {
    const newAddressDto = {
      fullName: 'Jane Doe',
      addressLine1: '123 Main St',
      city: 'NYC',
      postalCode: '10001',
      country: 'US',
    }

    it('creates non-default address when user already has addresses', async () => {
      mockPrismaService.address.count.mockResolvedValue(2)
      mockPrismaService.address.create.mockResolvedValue(baseAddress)

      await addressesService.create('user-1', newAddressDto)

      expect(mockPrismaService.address.create).toHaveBeenCalledWith({
        data: { ...newAddressDto, userId: 'user-1', isDefault: false },
      })
    })

    it('first address is automatically default', async () => {
      mockPrismaService.address.count.mockResolvedValue(0)
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback({
          address: {
            updateMany: jest.fn(),
            create: jest.fn().mockResolvedValue({ ...baseAddress, isDefault: true }),
          },
        }),
      )

      await addressesService.create('user-1', newAddressDto)

      expect(mockPrismaService.$transaction).toHaveBeenCalled()
    })

    it('throws ForbiddenException when user has 5 addresses already', async () => {
      mockPrismaService.address.count.mockResolvedValue(5)

      await expect(addressesService.create('user-1', newAddressDto)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('resets other defaults when creating with isDefault=true', async () => {
      mockPrismaService.address.count.mockResolvedValue(2)
      const txMock = {
        address: {
          updateMany: jest.fn(),
          create: jest.fn().mockResolvedValue({ ...baseAddress, isDefault: true }),
        },
      }
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMock))

      await addressesService.create('user-1', { ...newAddressDto, isDefault: true })

      expect(txMock.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      })
    })
  })

  describe('update', () => {
    it('updates address owned by the user', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(baseAddress)
      mockPrismaService.address.update.mockResolvedValue({
        ...baseAddress,
        city: 'Boston',
      })

      const updateDto = {
        fullName: baseAddress.fullName,
        addressLine1: baseAddress.addressLine1,
        city: 'Boston',
        postalCode: baseAddress.postalCode,
        country: baseAddress.country,
      }
      await addressesService.update('user-1', 'addr-1', updateDto)

      expect(mockPrismaService.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: expect.objectContaining({ city: 'Boston' }),
      })
    })

    const minimalDto = {
      fullName: 'Jane',
      addressLine1: '123',
      city: 'NYC',
      postalCode: '10001',
      country: 'US',
    }

    it('throws NotFoundException when address belongs to another user', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...baseAddress,
        userId: 'someone-else',
      })

      await expect(addressesService.update('user-1', 'addr-1', minimalDto)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws NotFoundException when address does not exist', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(null)

      await expect(addressesService.update('user-1', 'addr-missing', minimalDto)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('setDefault', () => {
    it('promotes address to default and resets others', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(baseAddress)
      const txMock = {
        address: {
          updateMany: jest.fn(),
          update: jest.fn().mockResolvedValue({ ...baseAddress, isDefault: true }),
        },
      }
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMock))

      await addressesService.setDefault('user-1', 'addr-1')

      expect(txMock.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true, NOT: { id: 'addr-1' } },
        data: { isDefault: false },
      })
    })
  })

  describe('remove', () => {
    it('deletes address owned by the user', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(baseAddress)
      mockPrismaService.address.delete.mockResolvedValue(baseAddress)

      await addressesService.remove('user-1', 'addr-1')

      expect(mockPrismaService.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-1' } })
    })

    it('promotes most recent remaining address when default is deleted', async () => {
      const defaultAddress = { ...baseAddress, isDefault: true }
      const otherAddress = { ...baseAddress, id: 'addr-2', isDefault: false }
      mockPrismaService.address.findUnique.mockResolvedValue(defaultAddress)
      mockPrismaService.address.findFirst.mockResolvedValue(otherAddress)

      await addressesService.remove('user-1', 'addr-1')

      expect(mockPrismaService.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      })
    })

    it('does not promote when default deleted and no other addresses remain', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue({ ...baseAddress, isDefault: true })
      mockPrismaService.address.findFirst.mockResolvedValue(null)

      await addressesService.remove('user-1', 'addr-1')

      expect(mockPrismaService.address.update).not.toHaveBeenCalled()
    })
  })
})

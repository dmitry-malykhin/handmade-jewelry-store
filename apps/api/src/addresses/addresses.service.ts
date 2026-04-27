import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Address } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertAddressDto } from './dto/upsert-address.dto'

const MAX_ADDRESSES_PER_USER = 5

@Injectable()
export class AddressesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserAddresses(userId: string): Promise<Address[]> {
    return this.prismaService.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async create(userId: string, dto: UpsertAddressDto): Promise<Address> {
    const existingCount = await this.prismaService.address.count({ where: { userId } })
    if (existingCount >= MAX_ADDRESSES_PER_USER) {
      throw new ForbiddenException(`Maximum ${MAX_ADDRESSES_PER_USER} addresses allowed per user`)
    }

    // First saved address becomes default automatically
    const isFirstAddress = existingCount === 0
    const shouldBeDefault = dto.isDefault === true || isFirstAddress

    if (shouldBeDefault) {
      // Reset other defaults atomically with the create
      return this.prismaService.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
        return tx.address.create({
          data: { ...dto, userId, isDefault: true },
        })
      })
    }

    return this.prismaService.address.create({
      data: { ...dto, userId, isDefault: false },
    })
  }

  async update(userId: string, addressId: string, dto: UpsertAddressDto): Promise<Address> {
    await this.assertOwnership(userId, addressId)

    if (dto.isDefault === true) {
      return this.prismaService.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id: addressId } },
          data: { isDefault: false },
        })
        return tx.address.update({
          where: { id: addressId },
          data: { ...dto, isDefault: true },
        })
      })
    }

    return this.prismaService.address.update({
      where: { id: addressId },
      data: dto,
    })
  }

  async setDefault(userId: string, addressId: string): Promise<Address> {
    await this.assertOwnership(userId, addressId)

    return this.prismaService.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      })
      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      })
    })
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.assertOwnership(userId, addressId)
    await this.prismaService.address.delete({ where: { id: addressId } })

    // If we just deleted the default, promote the most recent remaining address
    if (address.isDefault) {
      const next = await this.prismaService.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
      if (next) {
        await this.prismaService.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async assertOwnership(userId: string, addressId: string): Promise<Address> {
    const address = await this.prismaService.address.findUnique({ where: { id: addressId } })
    if (!address) {
      throw new NotFoundException(`Address with id "${addressId}" not found`)
    }
    if (address.userId !== userId) {
      // Same response as not-found to avoid leaking existence of other users' addresses
      throw new NotFoundException(`Address with id "${addressId}" not found`)
    }
    return address
  }
}

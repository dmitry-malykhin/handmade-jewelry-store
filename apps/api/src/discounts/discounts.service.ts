import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DiscountType, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateDiscountDto } from './dto/create-discount.dto'
import { UpdateDiscountDto } from './dto/update-discount.dto'
import { ValidateDiscountDto } from './dto/validate-discount.dto'

/**
 * Computes the discount in cents for a given subtotal. Percentage discounts
 * are bounded by the subtotal — a 100% off code on a $50 cart returns 5000,
 * not the percentage interpretation that could exceed cart total.
 */
export function computeDiscountAmountCents(
  type: DiscountType,
  value: number,
  subtotalCents: number,
): number {
  if (type === DiscountType.PERCENTAGE) {
    return Math.min(Math.floor((subtotalCents * value) / 100), subtotalCents)
  }
  return Math.min(value, subtotalCents)
}

@Injectable()
export class DiscountsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.discount.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOneById(discountId: string) {
    const discount = await this.prismaService.discount.findUnique({
      where: { id: discountId },
    })
    if (!discount || discount.deletedAt) {
      throw new NotFoundException(`Discount ${discountId} not found`)
    }
    return discount
  }

  async create(createDiscountDto: CreateDiscountDto) {
    this.assertValidValueForType(createDiscountDto.type, createDiscountDto.value)

    const normalisedCode = createDiscountDto.code.toUpperCase()

    try {
      return await this.prismaService.discount.create({
        data: {
          code: normalisedCode,
          type: createDiscountDto.type,
          value: createDiscountDto.value,
          minOrderCents: createDiscountDto.minOrderCents ?? 0,
          maxUsages: createDiscountDto.maxUsages ?? null,
          expiresAt: createDiscountDto.expiresAt ? new Date(createDiscountDto.expiresAt) : null,
          isActive: createDiscountDto.isActive ?? true,
        },
      })
    } catch (error) {
      // P2002 = unique constraint violation on `code`
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Discount code "${normalisedCode}" already exists`)
      }
      throw error
    }
  }

  async update(discountId: string, updateDiscountDto: UpdateDiscountDto) {
    await this.findOneById(discountId)
    return this.prismaService.discount.update({
      where: { id: discountId },
      data: {
        ...(updateDiscountDto.isActive !== undefined && { isActive: updateDiscountDto.isActive }),
        ...(updateDiscountDto.minOrderCents !== undefined && {
          minOrderCents: updateDiscountDto.minOrderCents,
        }),
        ...(updateDiscountDto.maxUsages !== undefined && {
          maxUsages: updateDiscountDto.maxUsages,
        }),
        ...(updateDiscountDto.expiresAt !== undefined && {
          expiresAt: updateDiscountDto.expiresAt ? new Date(updateDiscountDto.expiresAt) : null,
        }),
      },
    })
  }

  /**
   * Soft delete — historical orders keep referencing the code, but the admin
   * list filters by `deletedAt: null` and the validate endpoint treats deleted
   * codes the same as "not found".
   */
  async remove(discountId: string) {
    await this.findOneById(discountId)
    await this.prismaService.discount.update({
      where: { id: discountId },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Public-facing validation. Returns the discount details + computed amount
   * the cart should be reduced by. Throws specific errors so the frontend can
   * surface a precise message ("expired", "minimum order $X").
   */
  async validate(validateDiscountDto: ValidateDiscountDto) {
    const normalisedCode = validateDiscountDto.code.toUpperCase()
    const discount = await this.prismaService.discount.findUnique({
      where: { code: normalisedCode },
    })

    if (!discount || discount.deletedAt) {
      throw new NotFoundException(`Discount code "${normalisedCode}" not found`)
    }
    if (!discount.isActive) {
      throw new BadRequestException('Discount code is not active')
    }
    if (discount.expiresAt && discount.expiresAt < new Date()) {
      throw new BadRequestException('Discount code has expired')
    }
    if (discount.maxUsages !== null && discount.usageCount >= discount.maxUsages) {
      throw new BadRequestException('Discount code has reached its usage limit')
    }

    const subtotalCents = validateDiscountDto.subtotalCents ?? 0
    if (subtotalCents < discount.minOrderCents) {
      throw new BadRequestException(
        `Minimum order ${(discount.minOrderCents / 100).toFixed(2)} not met`,
      )
    }

    const discountAmountCents = computeDiscountAmountCents(
      discount.type,
      discount.value,
      subtotalCents,
    )

    return {
      id: discount.id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmountCents,
      minOrderCents: discount.minOrderCents,
      expiresAt: discount.expiresAt,
    }
  }

  /**
   * Atomically bumps usageCount. Intended for the order create / payment
   * webhook flow (not wired in this PR — tracked separately). Returns the
   * updated record so callers can detect "now exhausted" states.
   */
  async incrementUsage(discountId: string) {
    return this.prismaService.discount.update({
      where: { id: discountId },
      data: { usageCount: { increment: 1 } },
    })
  }

  private assertValidValueForType(type: DiscountType, value: number): void {
    if (type === DiscountType.PERCENTAGE && (value < 1 || value > 100)) {
      throw new BadRequestException('PERCENTAGE discount value must be between 1 and 100')
    }
    if (type === DiscountType.FIXED_AMOUNT && value < 1) {
      throw new BadRequestException('FIXED_AMOUNT discount value must be at least 1 cent')
    }
  }
}

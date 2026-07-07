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

// Prisma transaction client slice for `applyOnOrderCreate` — accepts either
// the service itself or a $transaction client, so a caller can atomically tie
// the usage bump to order creation.
export type DiscountsPrismaClient = {
  discount: Pick<PrismaService['discount'], 'findUnique' | 'updateMany'>
}

export interface AppliedDiscount {
  code: string
  type: DiscountType
  discountAmountCents: number
}

// Bounded by subtotal — a 100% code on a $50 cart returns 5000, never above.
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

  // Soft delete — historical orders still reference the code; admin list
  // filters by deletedAt: null, validate treats deleted as "not found".
  async remove(discountId: string) {
    await this.findOneById(discountId)
    await this.prismaService.discount.update({
      where: { id: discountId },
      data: { deletedAt: new Date() },
    })
  }

  // Throws specific errors so the frontend can render precise copy
  // ("expired", "minimum order $X").
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
   * Applied inside the order-create transaction (#347). Re-validates the code
   * server-side, atomically bumps `usageCount` (a conditional `updateMany`
   * against `usageCount < maxUsages` so two concurrent checkouts can't push
   * the counter past `maxUsages`), and returns the discount snapshot the
   * caller writes onto the Order. Throws on any validation failure — the
   * transaction rolls back and no order is created.
   *
   * Refunds do NOT decrement usageCount (per issue scope) — the code was
   * used at checkout, that's what the limit tracks.
   */
  async applyOnOrderCreate(
    prismaClient: DiscountsPrismaClient,
    args: { code: string; subtotalCents: number },
  ): Promise<AppliedDiscount> {
    const normalisedCode = args.code.toUpperCase()
    const discount = await prismaClient.discount.findUnique({
      where: { code: normalisedCode },
    })

    if (!discount || discount.deletedAt) {
      throw new BadRequestException(`Discount code "${normalisedCode}" not found`)
    }
    if (!discount.isActive) {
      throw new BadRequestException('Discount code is not active')
    }
    if (discount.expiresAt && discount.expiresAt < new Date()) {
      throw new BadRequestException('Discount code has expired')
    }
    if (args.subtotalCents < discount.minOrderCents) {
      throw new BadRequestException(
        `Minimum order ${(discount.minOrderCents / 100).toFixed(2)} not met`,
      )
    }

    // Race-safe bump: two concurrent order-creates for a code with
    // `maxUsages = usageCount + 1` remaining both pass the `<` check up top
    // but only one wins the `updateMany` (the other matches 0 rows).
    if (discount.maxUsages !== null) {
      const bumped = await prismaClient.discount.updateMany({
        where: { id: discount.id, usageCount: { lt: discount.maxUsages } },
        data: { usageCount: { increment: 1 } },
      })
      if (bumped.count === 0) {
        throw new BadRequestException('Discount code has reached its usage limit')
      }
    } else {
      await prismaClient.discount.updateMany({
        where: { id: discount.id },
        data: { usageCount: { increment: 1 } },
      })
    }

    return {
      code: discount.code,
      type: discount.type,
      discountAmountCents: computeDiscountAmountCents(
        discount.type,
        discount.value,
        args.subtotalCents,
      ),
    }
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

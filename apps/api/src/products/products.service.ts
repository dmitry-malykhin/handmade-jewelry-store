import { Injectable, NotFoundException } from '@nestjs/common'
import { ProductStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { AdminProductQueryDto } from './dto/admin-product-query.dto'
import { ProductQueryDto, ProductSortField, SortOrder } from './dto/product-query.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(productQueryDto: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      categorySlug,
      search,
      minPrice,
      maxPrice,
      material,
      sortBy = ProductSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = productQueryDto
    const skip = (page - 1) * limit

    const whereClause = {
      // Public catalog only shows ACTIVE products
      status: ProductStatus.ACTIVE,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(material && { material: { contains: material, mode: 'insensitive' as const } }),
    }

    const [products, totalCount] = await Promise.all([
      this.prismaService.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { category: { select: { name: true, slug: true } } },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prismaService.product.count({ where: whereClause }),
    ])

    return {
      data: products,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  async findOneBySlug(productSlug: string) {
    const product = await this.prismaService.product.findUnique({
      where: { slug: productSlug },
      include: { category: { select: { name: true, slug: true } } },
    })

    if (!product) {
      throw new NotFoundException(`Product with slug "${productSlug}" not found`)
    }

    return product
  }

  async create(createProductDto: CreateProductDto) {
    return this.prismaService.product.create({
      data: createProductDto,
      include: { category: { select: { name: true, slug: true } } },
    })
  }

  async update(productSlug: string, updateProductDto: UpdateProductDto) {
    await this.findOneBySlug(productSlug)

    return this.prismaService.product.update({
      where: { slug: productSlug },
      data: updateProductDto,
      include: { category: { select: { name: true, slug: true } } },
    })
  }

  async remove(productSlug: string) {
    await this.findOneBySlug(productSlug)
    await this.prismaService.product.delete({ where: { slug: productSlug } })
  }

  async findAllAdmin(adminProductQueryDto: AdminProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      categorySlug,
      search,
      sortBy = ProductSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = adminProductQueryDto
    const skip = (page - 1) * limit

    const whereClause = {
      // Admin sees all statuses unless explicitly filtered
      ...(status && { status }),
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [products, totalCount] = await Promise.all([
      this.prismaService.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { category: { select: { name: true, slug: true } } },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prismaService.product.count({ where: whereClause }),
    ])

    return {
      data: products,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  async updateStatus(productId: string, newStatus: ProductStatus) {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`)
    }

    return this.prismaService.product.update({
      where: { id: productId },
      data: { status: newStatus },
      select: { id: true, slug: true, title: true, status: true },
    })
  }
}

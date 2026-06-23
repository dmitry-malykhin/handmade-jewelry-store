import { Injectable, NotFoundException } from '@nestjs/common'
import { ProductStatus, StockType } from '@prisma/client'
import { buildCsvDocument } from '../common/csv/csv-formatter'
import { paginate } from '../common/pagination/paginate'
import { PrismaService } from '../prisma/prisma.service'
import { BackInStockService } from '../wishlist/back-in-stock.service'
import { BulkProductAction, BulkProductsActionDto } from './dto/bulk-products-action.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { AdminProductQueryDto } from './dto/admin-product-query.dto'
import { InventoryQueryDto } from './dto/inventory-query.dto'
import { ProductQueryDto, ProductSortField, SortOrder } from './dto/product-query.dto'
import { UpdateProductDto } from './dto/update-product.dto'

const PRODUCT_EXPORT_HEADERS = [
  'id',
  'title',
  'sku',
  'price',
  'stock',
  'material',
  'category',
  'status',
  'created_at',
] as const

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly backInStockService: BackInStockService,
  ) {}

  async findAll(productQueryDto: ProductQueryDto) {
    const {
      page,
      limit,
      categorySlug,
      search,
      minPrice,
      maxPrice,
      material,
      sortBy = ProductSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = productQueryDto

    const whereClause = {
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

    return paginate(
      { page, limit },
      (skip, take) =>
        this.prismaService.product.findMany({
          where: whereClause,
          skip,
          take,
          include: { category: { select: { name: true, slug: true } } },
          orderBy: { [sortBy]: sortOrder },
        }),
      () => this.prismaService.product.count({ where: whereClause }),
    )
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

  // ILIKE rather than tsvector — handmade catalogues are small enough that
  // the simpler approach wins. Revisit (to_tsvector + GIN) once ~1000 SKUs.
  async searchProducts(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return []

    return this.prismaService.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' as const } },
          { description: { contains: trimmed, mode: 'insensitive' as const } },
          { material: { contains: trimmed, mode: 'insensitive' as const } },
        ],
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ title: 'asc' }],
      take: 50,
    })
  }

  async create(createProductDto: CreateProductDto) {
    return this.prismaService.product.create({
      data: createProductDto,
      include: { category: { select: { name: true, slug: true } } },
    })
  }

  async update(productSlug: string, updateProductDto: UpdateProductDto) {
    const previous = await this.findOneBySlug(productSlug)

    const updated = await this.prismaService.product.update({
      where: { slug: productSlug },
      data: updateProductDto,
      include: { category: { select: { name: true, slug: true } } },
    })

    // Fan-out only on 0 → >0; fire-and-forget so the admin response stays fast.
    if (previous.stock === 0 && updated.stock > 0) {
      void this.backInStockService.notifyForProduct(updated.id)
    }

    return updated
  }

  async remove(productSlug: string) {
    await this.findOneBySlug(productSlug)
    await this.prismaService.product.delete({ where: { slug: productSlug } })
  }

  async exportToCsv(): Promise<string> {
    const products = await this.prismaService.product.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const rows = products.map((product) => [
      product.id,
      product.title,
      product.sku ?? '',
      product.price.toFixed(2),
      product.stock,
      product.material ?? '',
      product.category.name,
      product.status,
      product.createdAt.toISOString(),
    ])

    return buildCsvDocument(PRODUCT_EXPORT_HEADERS, rows)
  }

  async findAllAdmin(adminProductQueryDto: AdminProductQueryDto) {
    const {
      page,
      limit,
      status,
      categorySlug,
      search,
      sortBy = ProductSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = adminProductQueryDto

    const whereClause = {
      ...(status && { status }),
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    return paginate(
      { page, limit },
      (skip, take) =>
        this.prismaService.product.findMany({
          where: whereClause,
          skip,
          take,
          include: { category: { select: { name: true, slug: true } } },
          orderBy: { [sortBy]: sortOrder },
        }),
      () => this.prismaService.product.count({ where: whereClause }),
    )
  }

  // `affectedCount` lets callers detect partial application (an id deleted
  // between table render and click).
  async bulkAction(payload: BulkProductsActionDto): Promise<{ affectedCount: number }> {
    const { ids, action } = payload

    if (action === BulkProductAction.DELETE) {
      const result = await this.prismaService.product.deleteMany({ where: { id: { in: ids } } })
      return { affectedCount: result.count }
    }

    const nextStatus =
      action === BulkProductAction.PUBLISH ? ProductStatus.ACTIVE : ProductStatus.DRAFT
    const result = await this.prismaService.product.updateMany({
      where: { id: { in: ids } },
      data: { status: nextStatus },
    })
    return { affectedCount: result.count }
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

  // `isLowStock` only flags IN_STOCK rows — MADE_TO_ORDER and ONE_OF_A_KIND
  // aren't depleted by orders in the conventional sense.
  async findInventory(inventoryQueryDto: InventoryQueryDto) {
    const threshold = inventoryQueryDto.threshold ?? 3
    const lowStockOnly = inventoryQueryDto.lowStockOnly ?? false

    const whereClause = lowStockOnly
      ? { stockType: StockType.IN_STOCK, stock: { lte: threshold } }
      : {}

    const products = await this.prismaService.product.findMany({
      where: whereClause,
      orderBy: [{ stock: 'asc' }, { title: 'asc' }],
      include: { category: { select: { name: true, slug: true } } },
    })

    return {
      threshold,
      data: products.map((product) => ({
        ...product,
        isLowStock: product.stockType === StockType.IN_STOCK && product.stock <= threshold,
      })),
    }
  }

  // Separate endpoint so the sidebar badge doesn't pull the full inventory
  // payload on every admin page navigation.
  async countLowStock(threshold = 3): Promise<number> {
    return this.prismaService.product.count({
      where: { stockType: StockType.IN_STOCK, stock: { lte: threshold } },
    })
  }

  // Separate from update() — the inline-edit flow doesn't round-trip the full
  // edit payload (images, SEO fields, dimensions).
  async updateStock(productId: string, newStock: number) {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`)
    }

    return this.prismaService.product.update({
      where: { id: productId },
      data: { stock: newStock },
      select: { id: true, slug: true, title: true, stock: true, stockType: true },
    })
  }
}

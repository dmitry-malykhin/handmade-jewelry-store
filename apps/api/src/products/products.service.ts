import { Injectable, NotFoundException } from '@nestjs/common'
import { ProductStatus, StockType } from '@prisma/client'
import { buildCsvDocument } from '../common/csv/csv-formatter'
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

  /**
   * Customer-facing product search (#99). Matches title / description /
   * material via case-insensitive `contains` against ACTIVE products only.
   *
   * Caps results at 50 — search pages don't paginate; if the customer wants
   * to see more matches we expect them to refine the query. Empty / whitespace
   * queries short-circuit to an empty result so the UI can render the "no
   * query" state without an unnecessary DB roundtrip.
   *
   * Note: this uses ILIKE-style matching rather than Postgres tsvector. The
   * catalogue is small (handmade scale) so the simpler approach wins on
   * complexity. Switch to `to_tsvector + GIN` once the catalogue passes ~1000
   * products and ILIKE scans become measurable.
   */
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
      // Title matches are intuitively most relevant; orderBy title asc gives
      // a stable, predictable ranking without the cost of tsvector ranking.
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

    // Back-in-stock fan-out: only when stock genuinely transitions from 0 → >0.
    // Fire-and-forget so the admin response stays fast; failures are logged inside the service.
    if (previous.stock === 0 && updated.stock > 0) {
      void this.backInStockService.notifyForProduct(updated.id)
    }

    return updated
  }

  async remove(productSlug: string) {
    await this.findOneBySlug(productSlug)
    await this.prismaService.product.delete({ where: { slug: productSlug } })
  }

  /**
   * Builds a CSV document of the full product catalogue. No pagination — admin
   * triggering an export expects every product. Sorted newest-first so the
   * spreadsheet opens with the most recently added items at the top.
   */
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

  /**
   * Apply one action across many products. Returns `{ affectedCount }` —
   * callers can compare this to `ids.length` to detect partial application
   * (typically: an id was deleted between the table render and the click).
   *
   * No transaction wrapper: each row is independent, and a single failing row
   * shouldn't strand the others. Prisma's `updateMany`/`deleteMany` already
   * runs as one SQL statement per call.
   */
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

  /**
   * Lists products for the admin inventory view, sorted by stock ASC so the
   * most-at-risk items surface first. Adds an `isLowStock` flag computed from
   * the threshold — only IN_STOCK type counts, since MADE_TO_ORDER and
   * ONE_OF_A_KIND items aren't depleted by orders in the conventional sense.
   *
   * `lowStockOnly` toggle filters the result set to flagged items in SQL so
   * the table doesn't ship the full catalog when admin is investigating
   * restocks specifically.
   */
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

  /**
   * Returns the count of products currently at or below the threshold —
   * separate endpoint so the sidebar badge query is cheap and doesn't pull
   * the full inventory payload on every page load.
   */
  async countLowStock(threshold = 3): Promise<number> {
    return this.prismaService.product.count({
      where: { stockType: StockType.IN_STOCK, stock: { lte: threshold } },
    })
  }

  /**
   * Quick stock update from the inventory page — kept as its own method so
   * the inline-edit flow doesn't have to round-trip the full product edit
   * payload (images, SEO fields, dimensions, etc.).
   */
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

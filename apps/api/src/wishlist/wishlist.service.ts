import { Injectable, NotFoundException } from '@nestjs/common'
import type { Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WishlistService {
  constructor(private readonly prismaService: PrismaService) {}

  async getWishlist(userId: string): Promise<Product[]> {
    const wishlist = await this.prismaService.wishlist.findUnique({
      where: { userId },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    })
    return wishlist?.products ?? []
  }

  async addToWishlist(userId: string, productId: string): Promise<{ added: boolean }> {
    await this.assertProductExists(productId)

    // Upsert ensures the user has a Wishlist row even on the first add.
    // Connecting an already-connected product is a no-op in Prisma — idempotent by design.
    await this.prismaService.wishlist.upsert({
      where: { userId },
      create: { userId, products: { connect: { id: productId } } },
      update: { products: { connect: { id: productId } } },
    })
    return { added: true }
  }

  async removeFromWishlist(userId: string, productId: string): Promise<{ removed: boolean }> {
    const wishlist = await this.prismaService.wishlist.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!wishlist) {
      // Nothing to remove from — treat as success to keep the API idempotent.
      return { removed: true }
    }
    await this.prismaService.wishlist.update({
      where: { userId },
      data: { products: { disconnect: { id: productId } } },
    })
    return { removed: true }
  }

  async mergeGuestWishlist(userId: string, productIds: string[]): Promise<Product[]> {
    if (productIds.length === 0) {
      return this.getWishlist(userId)
    }

    // Filter to existing product IDs to silently ignore stale localStorage entries
    // (e.g. product was deleted while user was browsing as a guest).
    const existing = await this.prismaService.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    })
    const validIds = existing.map((product) => product.id)

    if (validIds.length === 0) {
      return this.getWishlist(userId)
    }

    await this.prismaService.wishlist.upsert({
      where: { userId },
      create: {
        userId,
        products: { connect: validIds.map((id) => ({ id })) },
      },
      update: {
        products: { connect: validIds.map((id) => ({ id })) },
      },
    })

    return this.getWishlist(userId)
  }

  /**
   * Returns the user IDs of every customer who has wishlisted the given product.
   * Used by the back-in-stock notification flow when a product transitions from
   * out-of-stock to available.
   */
  async findUsersWishlistingProduct(productId: string): Promise<string[]> {
    const wishlists = await this.prismaService.wishlist.findMany({
      where: { products: { some: { id: productId } } },
      select: { userId: true },
    })
    return wishlists.map((wishlist) => wishlist.userId)
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`)
    }
  }
}

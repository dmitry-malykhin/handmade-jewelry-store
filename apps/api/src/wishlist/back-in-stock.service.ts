import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BackInStockService {
  private readonly logger = new Logger(BackInStockService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Sends a back-in-stock email to every user who has wishlisted the given product.
   * Called when a product's stock transitions from 0 to >0. Failures of individual
   * emails are caught and logged — one bad recipient must not block the rest.
   */
  async notifyForProduct(productId: string): Promise<void> {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, slug: true, images: true },
    })
    if (!product) {
      this.logger.warn(`notifyForProduct called with unknown productId="${productId}"`)
      return
    }

    const wishlists = await this.prismaService.wishlist.findMany({
      where: { products: { some: { id: productId } } },
      select: { user: { select: { email: true } } },
    })

    if (wishlists.length === 0) {
      return
    }

    this.logger.log(
      `Sending back-in-stock for productId="${productId}" to ${wishlists.length} recipient(s)`,
    )

    const productImageUrl = product.images[0]
    await Promise.all(
      wishlists.map(async (wishlist) => {
        try {
          await this.emailService.sendBackInStock({
            recipientEmail: wishlist.user.email,
            productTitle: product.title,
            productSlug: product.slug,
            ...(productImageUrl && { productImageUrl }),
          })
        } catch (error) {
          this.logger.error(
            `Back-in-stock send failed for ${wishlist.user.email}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }),
    )
  }
}

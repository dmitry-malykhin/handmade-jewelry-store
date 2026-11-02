import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// Fields we intentionally never surface in the export:
//   password, passwordResetToken(At), emailVerificationToken(At): authn secrets
//   refreshTokens: session secrets
//   NewsletterConsent.confirmationTokenHash / confirmationTokenAt: single-use secrets
// Everything else that touches the account's own data is in-scope for GDPR
// Art. 15 (right of access) and Art. 20 (portability, JSON satisfies both).
@Injectable()
export class UsersExportService {
  constructor(private readonly prismaService: PrismaService) {}

  async exportForUser(userId: string, now: Date = new Date()) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        emailVerifiedAt: true,
        loyaltyBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const [addresses, orders, reviews, wishlist, loyaltyTransactions, newsletterConsents] =
      await Promise.all([
        this.prismaService.address.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        }),
        this.prismaService.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payment: {
              select: { id: true, stripeId: true, amount: true, status: true, createdAt: true },
            },
            statusHistory: { orderBy: { createdAt: 'asc' } },
            terms: true,
          },
        }),
        this.prismaService.review.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { id: true, slug: true, title: true } } },
        }),
        this.prismaService.wishlist.findUnique({
          where: { userId },
          include: { products: { select: { id: true, slug: true, title: true } } },
        }),
        this.prismaService.loyaltyTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.newsletterConsent.findMany({
          where: { email: user.email },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            status: true,
            ipAddress: true,
            userAgent: true,
            formVersion: true,
            sourceUrl: true,
            createdAt: true,
            confirmedAt: true,
            unsubscribedAt: true,
          },
        }),
      ])

    return {
      exportedAt: now.toISOString(),
      schemaVersion: 'v1-2026-11',
      user,
      addresses,
      orders,
      reviews,
      wishlist,
      loyaltyTransactions,
      newsletterConsents,
    }
  }
}

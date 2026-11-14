import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { NewsletterConsentStatus, OrderStatus, Prisma, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { paginate } from '../common/pagination/paginate'
import { KlaviyoNewsletterClient } from '../newsletter/klaviyo-newsletter.client'
import { PrismaService } from '../prisma/prisma.service'
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

// Exact-match phrase the caller must type to confirm destruction. Translated
// strings live in the frontend copy; the API compares against this canonical
// English token so backend tests and audit logs read the same thing.
export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT'

const BCRYPT_SALT_ROUNDS = 12

// PARTIALLY_REFUNDED is included — its non-refunded slice is real revenue;
// refundAmount is subtracted downstream.
const REVENUE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.PARTIALLY_REFUNDED,
]

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly klaviyoClient: KlaviyoNewsletterClient,
  ) {}

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } })
  }

  async findById(userId: string) {
    return this.prismaService.user.findUnique({ where: { id: userId } })
  }

  async createUser(email: string, plainPassword: string) {
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS)
    return this.prismaService.user.create({
      data: { email, password: hashedPassword, role: Role.USER },
    })
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  // JS aggregation rather than SQL subquery — customer rosters are small for
  // handmade stores, and keeps the SQL portable across SQLite/Postgres.
  async findAllCustomers(adminCustomerQueryDto: AdminCustomerQueryDto) {
    const { page, limit, search } = adminCustomerQueryDto

    const whereClause = {
      role: Role.USER,
      ...(search && {
        email: { contains: search, mode: 'insensitive' as const },
      }),
    }

    const { data: users, meta } = await paginate(
      { page, limit },
      (skip, take) =>
        this.prismaService.user.findMany({
          where: whereClause,
          skip,
          take,
          include: {
            orders: {
              select: { status: true, total: true, refundAmount: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      () => this.prismaService.user.count({ where: whereClause }),
    )

    const data = users.map((user) => {
      const revenueOrders = user.orders.filter((order) =>
        REVENUE_ORDER_STATUSES.includes(order.status),
      )
      const lifetimeValueUsd = revenueOrders.reduce((sum, order) => {
        const refunded = order.refundAmount ? order.refundAmount.toNumber() : 0
        return sum + order.total.toNumber() - refunded
      }, 0)
      const lastOrderAt = user.orders
        .map((order) => order.createdAt.getTime())
        .reduce((latest, current) => (current > latest ? current : latest), 0)
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        totalOrders: user.orders.length,
        lifetimeValueUsd: Number(lifetimeValueUsd.toFixed(2)),
        lastOrderAt: lastOrderAt > 0 ? new Date(lastOrderAt) : null,
      }
    })

    return { data, meta }
  }

  async findCustomerById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        addresses: { orderBy: { isDefault: 'desc' } },
      },
    })

    if (!user) {
      throw new NotFoundException(`Customer ${userId} not found`)
    }

    const revenueOrders = user.orders.filter((order) =>
      REVENUE_ORDER_STATUSES.includes(order.status),
    )
    const lifetimeValueUsd = Number(
      revenueOrders
        .reduce((sum, order) => {
          const refunded = order.refundAmount ? order.refundAmount.toNumber() : 0
          return sum + order.total.toNumber() - refunded
        }, 0)
        .toFixed(2),
    )

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      totalOrders: user.orders.length,
      lifetimeValueUsd,
      orders: user.orders,
      addresses: user.addresses,
    }
  }

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true },
    })
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`)
    }
    return user
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { name, phone } = updateProfileDto
    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(phone !== undefined && { phone: phone || null }),
      },
      select: { id: true, email: true, name: true, phone: true },
    })
    return updated
  }

  // GDPR Art. 17 (right to erasure) #642. Two-step reauth: current password
  // (bcrypt) + exact confirmation phrase, to prevent an XSS-stolen session
  // from one-shotting the destroy button.
  //
  // Data policy:
  //   - Order rows are RETAINED (tax law: 7 years under IRS 26 CFR §1.6001-1
  //     and EU VAT equivalents) but PII is stripped from them and userId is
  //     nulled so the Order no longer links to any person.
  //   - NewsletterConsent rows are flipped to UNSUBSCRIBED (audit trail of
  //     consent survives even after User disappears; that is the point of
  //     storing email there, not a FK to User).
  //   - Reviews + Wishlist are hard-deleted explicitly (no onDelete:Cascade
  //     on their relations).
  //   - User row + addresses / loyaltyTransactions / refreshTokens cascade
  //     out via onDelete:Cascade on their FKs.
  //   - Klaviyo profile revoked post-commit (fire-and-forget; external failure
  //     must not block the local erasure).
  async deleteSelfAccount(
    userId: string,
    password: string,
    confirmationPhrase: string,
  ): Promise<void> {
    if (confirmationPhrase !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
      throw new ForbiddenException('Invalid confirmation phrase')
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    })
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`)
    }

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) {
      throw new ForbiddenException('Invalid password')
    }

    await this.prismaService.$transaction(async (tx) => {
      // 1. Anonymise orders: retain for tax, strip PII, drop user link.
      const ordersToAnonymise = await tx.order.findMany({
        where: { userId },
        select: { id: true, shippingAddress: true },
      })
      for (const order of ordersToAnonymise) {
        const anonymisedShipping = anonymiseShippingAddress(order.shippingAddress)
        await tx.order.update({
          where: { id: order.id },
          data: {
            userId: null,
            guestEmail: null,
            shippingAddress: anonymisedShipping as Prisma.InputJsonValue,
          },
        })
      }

      // 2. Unsubscribe newsletter consents (audit row stays; status moves).
      await tx.newsletterConsent.updateMany({
        where: {
          email: user.email,
          status: { in: [NewsletterConsentStatus.CONFIRMED, NewsletterConsentStatus.PENDING] },
        },
        data: {
          status: NewsletterConsentStatus.UNSUBSCRIBED,
          unsubscribedAt: new Date(),
        },
      })

      // 3. Explicit deletes for relations without onDelete:Cascade.
      await tx.review.deleteMany({ where: { userId } })
      await tx.wishlist.deleteMany({ where: { userId } })

      // 4. Delete User: cascades addresses, loyaltyTransactions, refreshTokens.
      await tx.user.delete({ where: { id: userId } })
    })

    // External call outside the DB transaction so a Klaviyo outage does not
    // roll back the local erasure. If it fails, the rows are gone regardless;
    // the Klaviyo profile will decay on its own TTL.
    void this.klaviyoClient.unsubscribeEmail(user.email).catch((error: unknown) => {
      this.logger.warn(
        `Klaviyo revoke failed for ${maskEmail(user.email)}: ${(error as Error).message}`,
      )
    })

    this.logger.log(`Account deleted for user ${userId} (${maskEmail(user.email)})`)
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

// Preserve only the delivery jurisdiction (state + country) required by VAT /
// IRS audits; blank out the person-identifying fields of the JSON snapshot.
function anonymiseShippingAddress(raw: unknown): Record<string, unknown> {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pickString = (key: string): string | null => {
    const value = source[key]
    return typeof value === 'string' ? value : null
  }
  return {
    fullName: '[deleted]',
    addressLine1: '[deleted]',
    addressLine2: null,
    city: '[deleted]',
    state: pickString('state'),
    postalCode: '[deleted]',
    country: pickString('country') ?? 'XX',
    phone: null,
  }
}

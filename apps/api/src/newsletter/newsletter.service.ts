import * as crypto from 'node:crypto'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { NewsletterConsentStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { getFrontendUrl } from '../common/config/urls'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { KlaviyoNewsletterClient } from './klaviyo-newsletter.client'
import { issueUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token'

const CONFIRMATION_TOKEN_HASH_ROUNDS = 10
const CONFIRMATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Version stamp for the on-form consent copy. Bump whenever the wording of
// the consent statement changes so we can prove which version each row
// agreed to during a DPA/GDPR audit.
export const NEWSLETTER_FORM_VERSION = 'v1-2026-09'

export interface SubscribeParams {
  email: string
  ipAddress: string | null
  userAgent: string | null
  sourceUrl: string | null
}

export interface SubscribeResult {
  status: 'pending-confirmation'
}

export interface ConfirmResult {
  status: 'confirmed' | 'already-confirmed'
}

export interface UnsubscribeResult {
  status: 'unsubscribed' | 'already-unsubscribed'
}

// Builds the token-signed unsubscribe link embedded in every marketing email
// footer. Locale is hardcoded to 'en' at the URL level so the link works even
// before next-intl middleware sees the request; middleware redirects to the
// user's preferred locale on load.
export function buildUnsubscribeUrl(email: string): string {
  const token = issueUnsubscribeToken(email)
  const encodedEmail = encodeURIComponent(email)
  return `${getFrontendUrl()}/en/newsletter/unsubscribe?token=${token}&email=${encodedEmail}`
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly klaviyoClient: KlaviyoNewsletterClient,
    private readonly emailService: EmailService,
  ) {}

  async subscribe(params: SubscribeParams): Promise<SubscribeResult> {
    const plainToken = crypto.randomUUID()
    const tokenHash = await bcrypt.hash(plainToken, CONFIRMATION_TOKEN_HASH_ROUNDS)

    await this.prismaService.newsletterConsent.create({
      data: {
        email: params.email,
        status: NewsletterConsentStatus.PENDING,
        confirmationTokenHash: tokenHash,
        confirmationTokenAt: new Date(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        formVersion: NEWSLETTER_FORM_VERSION,
        sourceUrl: params.sourceUrl,
      },
    })

    await this.emailService.sendNewsletterConfirmation({
      recipientEmail: params.email,
      confirmationToken: plainToken,
      frontendUrl: getFrontendUrl(),
    })

    this.logger.log(`Newsletter confirmation email queued for ${maskEmail(params.email)}`)
    return { status: 'pending-confirmation' }
  }

  async confirm(email: string, plainToken: string): Promise<ConfirmResult> {
    const expiryThreshold = new Date(Date.now() - CONFIRMATION_TOKEN_TTL_MS)

    const candidates = await this.prismaService.newsletterConsent.findMany({
      where: {
        email,
        status: NewsletterConsentStatus.PENDING,
        confirmationTokenHash: { not: null },
        confirmationTokenAt: { gte: expiryThreshold },
      },
      orderBy: { createdAt: 'desc' },
    })

    for (const candidate of candidates) {
      if (!candidate.confirmationTokenHash) continue
      const tokenMatches = await bcrypt.compare(plainToken, candidate.confirmationTokenHash)
      if (!tokenMatches) continue

      await this.prismaService.newsletterConsent.update({
        where: { id: candidate.id },
        data: {
          status: NewsletterConsentStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmationTokenHash: null,
          confirmationTokenAt: null,
        },
      })

      await this.klaviyoClient.subscribeEmail(email)
      this.logger.log(`Newsletter subscription confirmed for ${maskEmail(email)}`)
      return { status: 'confirmed' }
    }

    const alreadyConfirmed = await this.prismaService.newsletterConsent.findFirst({
      where: { email, status: NewsletterConsentStatus.CONFIRMED },
    })
    if (alreadyConfirmed) {
      return { status: 'already-confirmed' }
    }

    if (candidates.length === 0) {
      throw new NotFoundException('No pending subscription found for this email.')
    }
    throw new BadRequestException('Invalid or expired confirmation token.')
  }

  async unsubscribe(email: string, token: string): Promise<UnsubscribeResult> {
    if (!verifyUnsubscribeToken(email, token)) {
      throw new BadRequestException('Invalid unsubscribe token.')
    }

    const activeRows = await this.prismaService.newsletterConsent.findMany({
      where: {
        email,
        status: { in: [NewsletterConsentStatus.CONFIRMED, NewsletterConsentStatus.PENDING] },
      },
      select: { id: true, status: true },
    })

    if (activeRows.length === 0) {
      return { status: 'already-unsubscribed' }
    }

    await this.prismaService.newsletterConsent.updateMany({
      where: { id: { in: activeRows.map((row) => row.id) } },
      data: {
        status: NewsletterConsentStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
        confirmationTokenHash: null,
        confirmationTokenAt: null,
      },
    })

    const hadConfirmed = activeRows.some((row) => row.status === NewsletterConsentStatus.CONFIRMED)
    if (hadConfirmed) {
      await this.klaviyoClient.unsubscribeEmail(email)
    }

    this.logger.log(`Newsletter unsubscribed for ${maskEmail(email)}`)
    return { status: 'unsubscribed' }
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

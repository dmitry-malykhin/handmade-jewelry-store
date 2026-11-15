import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as Sentry from '@sentry/nestjs'
import { PrismaService } from '../prisma/prisma.service'

// Retention windows encoded next to the code that enforces them so an audit
// can trace policy → enforcer with no ambiguity. Change here AND the matching
// paragraph in privacyPage.s6Body + s6Sched to keep the public policy in sync.
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface RetentionRunReport {
  refreshTokensPurged: number
  passwordResetTokensCleared: number
  emailVerificationTokensCleared: number
}

// GDPR Art. 5(1)(e) storage-limitation enforcement. Each job purges credentials
// that have outlived their legitimate purpose. We do NOT touch anything that
// has an audit or tax obligation here (orders, OrderTerms, LoyaltyTransaction);
// those live under their own retention logic.
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name)

  constructor(private readonly prismaService: PrismaService) {}

  // 03:00 UTC daily: off-peak for US and EU; Fly.io machine cold-start cost
  // is negligible for a once-a-day touch. Sentry breadcrumb + Winston log
  // combine to form the Art. 5(2) accountability trail without a dedicated
  // audit table (CloudWatch #121 retains the Winston stream immutably).
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runNightlyPurge(): Promise<RetentionRunReport> {
    const report = await this.runAll()
    this.logger.log(
      `data-retention cron: refresh=${report.refreshTokensPurged} ` +
        `pwdReset=${report.passwordResetTokensCleared} ` +
        `emailVerify=${report.emailVerificationTokensCleared}`,
    )
    Sentry.addBreadcrumb({
      category: 'retention',
      type: 'info',
      level: 'info',
      message: 'retention.nightly',
      data: { ...report },
    })
    return report
  }

  async runAll(now: Date = new Date()): Promise<RetentionRunReport> {
    const [refreshTokensPurged, passwordResetTokensCleared, emailVerificationTokensCleared] =
      await Promise.all([
        this.purgeExpiredRefreshTokens(now),
        this.clearExpiredPasswordResetTokens(now),
        this.clearExpiredEmailVerificationTokens(now),
      ])
    return {
      refreshTokensPurged,
      passwordResetTokensCleared,
      emailVerificationTokensCleared,
    }
  }

  // RefreshToken rows are physically useless after expiresAt (JwtRefreshGuard
  // rejects them anyway) and, uniquely among the token-like data, carry no
  // audit value. Hard-delete.
  async purgeExpiredRefreshTokens(now: Date): Promise<number> {
    const result = await this.prismaService.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    })
    return result.count
  }

  // Password-reset tokens: null the hash + timestamp pair on every User whose
  // last reset request is older than the 1-hour verify window. The User row
  // stays; only the dangling token material is removed.
  async clearExpiredPasswordResetTokens(now: Date): Promise<number> {
    const threshold = new Date(now.getTime() - PASSWORD_RESET_TOKEN_TTL_MS)
    const result = await this.prismaService.user.updateMany({
      where: {
        passwordResetTokenAt: { lt: threshold },
      },
      data: {
        passwordResetToken: null,
        passwordResetTokenAt: null,
      },
    })
    return result.count
  }

  // Email-verification tokens: null token + timestamp on Users whose last
  // verification email is older than the 7-day send window. emailVerifiedAt is
  // untouched, so a verified user stays verified; an unverified user's stale
  // token is simply cleared and they must request a fresh email.
  async clearExpiredEmailVerificationTokens(now: Date): Promise<number> {
    const threshold = new Date(now.getTime() - EMAIL_VERIFICATION_TOKEN_TTL_MS)
    const result = await this.prismaService.user.updateMany({
      where: {
        emailVerificationTokenAt: { lt: threshold },
      },
      data: {
        emailVerificationToken: null,
        emailVerificationTokenAt: null,
      },
    })
    return result.count
  }
}

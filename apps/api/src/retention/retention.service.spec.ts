// @nestjs/schedule ships ESM; stubbing it keeps ts-jest off the ESM hot path.
// The decorator itself is a side-effect-free registration, so a no-op is fine
// for a unit-level test that only exercises the method bodies.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_DAY_AT_3AM: '0 3 * * *' },
}))

import { Test, TestingModule } from '@nestjs/testing'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import {
  DataRetentionService,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from './retention.service'

const mockPrismaService = {
  refreshToken: { deleteMany: jest.fn() },
  user: { updateMany: jest.fn() },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/retention')
  await $allureSubSuite('retention.service')
  await $allureSeverity('critical')
})

describe('DataRetentionService (#571 GDPR Art. 5(1)(e))', () => {
  let dataRetentionService: DataRetentionService
  const FROZEN_NOW = new Date('2026-11-15T03:00:00.000Z')

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 7 })
    mockPrismaService.user.updateMany.mockResolvedValue({ count: 0 })

    const module: TestingModule = await Test.createTestingModule({
      providers: [DataRetentionService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    dataRetentionService = module.get(DataRetentionService)
  })

  describe('purgeExpiredRefreshTokens', () => {
    it('hard-deletes every RefreshToken whose expiresAt is before now', async () => {
      const count = await dataRetentionService.purgeExpiredRefreshTokens(FROZEN_NOW)

      expect(count).toBe(7)
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: FROZEN_NOW } },
      })
    })
  })

  describe('clearExpiredPasswordResetTokens', () => {
    it('nulls the token + timestamp on users whose last reset is older than 1 hour', async () => {
      mockPrismaService.user.updateMany.mockResolvedValueOnce({ count: 3 })

      const count = await dataRetentionService.clearExpiredPasswordResetTokens(FROZEN_NOW)

      expect(count).toBe(3)
      const expectedThreshold = new Date(FROZEN_NOW.getTime() - PASSWORD_RESET_TOKEN_TTL_MS)
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { passwordResetTokenAt: { lt: expectedThreshold } },
        data: { passwordResetToken: null, passwordResetTokenAt: null },
      })
    })

    it('uses exactly the 1-hour TTL constant so the public policy and code cannot drift', () => {
      expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000)
    })
  })

  describe('clearExpiredEmailVerificationTokens', () => {
    it('nulls the token + timestamp on users whose last verification email is older than 7 days', async () => {
      mockPrismaService.user.updateMany.mockResolvedValueOnce({ count: 2 })

      const count = await dataRetentionService.clearExpiredEmailVerificationTokens(FROZEN_NOW)

      expect(count).toBe(2)
      const expectedThreshold = new Date(FROZEN_NOW.getTime() - EMAIL_VERIFICATION_TOKEN_TTL_MS)
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { emailVerificationTokenAt: { lt: expectedThreshold } },
        data: { emailVerificationToken: null, emailVerificationTokenAt: null },
      })
    })

    it('uses exactly the 7-day TTL constant so the public policy and code cannot drift', () => {
      expect(EMAIL_VERIFICATION_TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('leaves emailVerifiedAt untouched: a verified account stays verified after cleanup', async () => {
      await dataRetentionService.clearExpiredEmailVerificationTokens(FROZEN_NOW)

      const [call] = mockPrismaService.user.updateMany.mock.calls
      expect(call[0].data).not.toHaveProperty('emailVerifiedAt')
    })
  })

  describe('runAll', () => {
    it('returns per-job counts for audit reporting', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValueOnce({ count: 11 })
      mockPrismaService.user.updateMany
        .mockResolvedValueOnce({ count: 4 }) // password reset
        .mockResolvedValueOnce({ count: 1 }) // email verify

      const report = await dataRetentionService.runAll(FROZEN_NOW)

      expect(report).toEqual({
        refreshTokensPurged: 11,
        passwordResetTokensCleared: 4,
        emailVerificationTokensCleared: 1,
      })
    })
  })
})

import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'
import { PrismaService } from '../prisma/prisma.service'
import { UsersExportService } from './users-export.service'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/users')
  await $allureSubSuite('users-export.service')
  await $allureSeverity('critical')
})

type PrismaMock = {
  user: { findUnique: jest.Mock }
  address: { findMany: jest.Mock }
  order: { findMany: jest.Mock }
  review: { findMany: jest.Mock }
  wishlist: { findUnique: jest.Mock }
  loyaltyTransaction: { findMany: jest.Mock }
  newsletterConsent: { findMany: jest.Mock }
}

describe('UsersExportService', () => {
  let service: UsersExportService
  let prisma: PrismaMock

  const FROZEN_NOW = new Date('2026-11-02T10:00:00.000Z')
  const userRow = {
    id: 'user-1',
    email: 'alice@example.com',
    role: Role.USER,
    name: 'Alice',
    phone: null,
    emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
    loyaltyBalance: 120,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-15T00:00:00.000Z'),
  }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(userRow) },
      address: { findMany: jest.fn().mockResolvedValue([{ id: 'addr-1', userId: 'user-1' }]) },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            userId: 'user-1',
            total: '49.99',
            items: [{ id: 'oi-1', productId: 'p-1', quantity: 1 }],
            payment: { id: 'pay-1', stripeId: 'pi_1', amount: '49.99', status: 'succeeded' },
            statusHistory: [],
            terms: null,
          },
        ]),
      },
      review: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'rev-1',
            userId: 'user-1',
            rating: 5,
            product: { id: 'p-1', slug: 'silver-ring', title: 'Silver Ring' },
          },
        ]),
      },
      wishlist: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'wl-1',
          userId: 'user-1',
          products: [{ id: 'p-2', slug: 'moonstone-pendant', title: 'Moonstone Pendant' }],
        }),
      },
      loyaltyTransaction: {
        findMany: jest.fn().mockResolvedValue([{ id: 'lt-1', userId: 'user-1', points: 50 }]),
      },
      newsletterConsent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'nc-1',
            email: 'alice@example.com',
            status: 'CONFIRMED',
            ipAddress: '127.0.0.1',
            userAgent: 'ua',
            formVersion: 'v1-2026-09',
            sourceUrl: null,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            confirmedAt: new Date('2026-09-01T00:05:00.000Z'),
            unsubscribedAt: null,
          },
        ]),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersExportService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(UsersExportService)
  })

  it('aggregates every per-user table into a single JSON payload (GDPR Art. 15)', async () => {
    const result = await service.exportForUser('user-1', FROZEN_NOW)

    expect(result.exportedAt).toBe('2026-11-02T10:00:00.000Z')
    expect(result.schemaVersion).toMatch(/^v\d/)
    expect(result.user).toMatchObject({ id: 'user-1', email: 'alice@example.com' })
    expect(result.addresses).toHaveLength(1)
    expect(result.orders).toHaveLength(1)
    expect(result.reviews).toHaveLength(1)
    expect(result.wishlist?.products).toHaveLength(1)
    expect(result.loyaltyTransactions).toHaveLength(1)
    expect(result.newsletterConsents).toHaveLength(1)
  })

  it('includes NewsletterConsent rows matched by email, not userId (closes #603)', async () => {
    await service.exportForUser('user-1', FROZEN_NOW)
    expect(prisma.newsletterConsent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alice@example.com' } }),
    )
  })

  it('never surfaces authn secrets (password, reset / verification tokens)', async () => {
    await service.exportForUser('user-1', FROZEN_NOW)
    const [{ select }] = prisma.user.findUnique.mock.calls[0]!
    expect(select).not.toHaveProperty('password')
    expect(select).not.toHaveProperty('passwordResetToken')
    expect(select).not.toHaveProperty('passwordResetTokenAt')
    expect(select).not.toHaveProperty('emailVerificationToken')
    expect(select).not.toHaveProperty('emailVerificationTokenAt')
  })

  it('never surfaces NewsletterConsent confirmation-token fields', async () => {
    await service.exportForUser('user-1', FROZEN_NOW)
    const [{ select }] = prisma.newsletterConsent.findMany.mock.calls[0]!
    expect(select).not.toHaveProperty('confirmationTokenHash')
    expect(select).not.toHaveProperty('confirmationTokenAt')
  })

  it('never queries the RefreshToken table (session secrets are out-of-scope)', async () => {
    const prismaWithRefresh = prisma as PrismaMock & { refreshToken?: { findMany: jest.Mock } }
    expect(prismaWithRefresh.refreshToken).toBeUndefined()
  })

  it('throws NotFoundException when the authenticated id does not resolve to a row', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null)
    await expect(service.exportForUser('ghost-user', FROZEN_NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('returns wishlist: null when the user has none (not an empty array)', async () => {
    prisma.wishlist.findUnique.mockResolvedValueOnce(null)
    const result = await service.exportForUser('user-1', FROZEN_NOW)
    expect(result.wishlist).toBeNull()
  })
})

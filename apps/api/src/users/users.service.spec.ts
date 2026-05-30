import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus, Role } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/users')
  await $allureSubSuite('users.service')
  await $allureSeverity('normal')
})

describe('UsersService', () => {
  let usersService: UsersService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    usersService = module.get<UsersService>(UsersService)
  })

  describe('findByEmail', () => {
    it('calls prisma with the provided email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null)

      await usersService.findByEmail('test@example.com')

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })
  })

  describe('findById', () => {
    it('calls prisma with the provided id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null)

      await usersService.findById('user_123')

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
      })
    })
  })

  describe('createUser', () => {
    it('creates a user with USER role and hashed password', async () => {
      const createdUser = {
        id: 'user_1',
        email: 'new@example.com',
        password: 'hashed',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrismaService.user.create.mockResolvedValueOnce(createdUser)

      const result = await usersService.createUser('new@example.com', 'plainpassword')

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            role: Role.USER,
          }),
        }),
      )
      // Password must be hashed — should NOT equal the plain text
      const callArg = mockPrismaService.user.create.mock.calls[0][0]
      expect(callArg.data.password).not.toBe('plainpassword')
      expect(result).toEqual(createdUser)
    })
  })

  describe('verifyPassword', () => {
    it('returns true when plain password matches the hash', async () => {
      // Create a real hash to compare against
      const bcrypt = await import('bcrypt')
      const hashedPassword = await bcrypt.hash('correct_password', 10)

      const result = await usersService.verifyPassword('correct_password', hashedPassword)

      expect(result).toBe(true)
    })

    it('returns false when plain password does not match the hash', async () => {
      const bcrypt = await import('bcrypt')
      const hashedPassword = await bcrypt.hash('correct_password', 10)

      const result = await usersService.verifyPassword('wrong_password', hashedPassword)

      expect(result).toBe(false)
    })
  })

  // ── findAllCustomers ──────────────────────────────────────────────────────

  describe('findAllCustomers()', () => {
    function buildUser(overrides: Record<string, unknown> = {}) {
      return {
        id: 'user-1',
        email: 'jane@example.com',
        role: Role.USER,
        createdAt: new Date('2026-04-01T00:00:00Z'),
        orders: [],
        ...overrides,
      }
    }

    it('filters out ADMIN users from the customer roster', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([])
      mockPrismaService.user.count.mockResolvedValueOnce(0)

      await usersService.findAllCustomers({})

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: Role.USER }),
        }),
      )
    })

    it('applies case-insensitive email search when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([])
      mockPrismaService.user.count.mockResolvedValueOnce(0)

      await usersService.findAllCustomers({ search: 'JANE' })

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: 'JANE', mode: 'insensitive' },
          }),
        }),
      )
    })

    it('computes lifetime value summing revenue-eligible orders minus refunds', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([
        buildUser({
          orders: [
            {
              status: OrderStatus.PAID,
              total: new Decimal('100'),
              refundAmount: null,
              createdAt: new Date(),
            },
            {
              status: OrderStatus.PARTIALLY_REFUNDED,
              total: new Decimal('50'),
              refundAmount: new Decimal('20'),
              createdAt: new Date(),
            },
            // Cancelled order — does NOT count toward LTV
            {
              status: OrderStatus.CANCELLED,
              total: new Decimal('999'),
              refundAmount: null,
              createdAt: new Date(),
            },
          ],
        }),
      ])
      mockPrismaService.user.count.mockResolvedValueOnce(1)

      const result = await usersService.findAllCustomers({})

      // 100 + (50 - 20) = 130; cancelled $999 excluded
      expect(result.data[0]?.lifetimeValueUsd).toBe(130)
      // totalOrders counts ALL orders, not just revenue ones (visible signal)
      expect(result.data[0]?.totalOrders).toBe(3)
    })

    it('returns pagination meta matching the page size', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([])
      mockPrismaService.user.count.mockResolvedValueOnce(42)

      const result = await usersService.findAllCustomers({ page: 2, limit: 20 })

      expect(result.meta).toEqual({ totalCount: 42, page: 2, limit: 20, totalPages: 3 })
    })

    it('records lastOrderAt as the latest order createdAt across all order statuses', async () => {
      const earlier = new Date('2026-01-01T00:00:00Z')
      const later = new Date('2026-03-15T00:00:00Z')
      mockPrismaService.user.findMany.mockResolvedValueOnce([
        buildUser({
          orders: [
            {
              status: OrderStatus.PAID,
              total: new Decimal('10'),
              refundAmount: null,
              createdAt: earlier,
            },
            {
              status: OrderStatus.PENDING,
              total: new Decimal('20'),
              refundAmount: null,
              createdAt: later,
            },
          ],
        }),
      ])
      mockPrismaService.user.count.mockResolvedValueOnce(1)

      const result = await usersService.findAllCustomers({})

      expect(result.data[0]?.lastOrderAt?.toISOString()).toBe(later.toISOString())
    })
  })

  // ── findCustomerById ──────────────────────────────────────────────────────

  describe('findCustomerById()', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null)

      await expect(usersService.findCustomerById('missing-id')).rejects.toThrow(NotFoundException)
    })

    it('returns profile with full order history, addresses, and lifetime value', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'jane@example.com',
        role: Role.USER,
        createdAt: new Date('2026-04-01T00:00:00Z'),
        orders: [
          {
            id: 'o1',
            status: OrderStatus.DELIVERED,
            total: new Decimal('200'),
            refundAmount: null,
            items: [],
          },
          {
            id: 'o2',
            status: OrderStatus.REFUNDED,
            total: new Decimal('50'),
            refundAmount: new Decimal('50'),
            items: [],
          },
        ],
        addresses: [{ id: 'a1', isDefault: true }],
      })

      const result = await usersService.findCustomerById('user-1')

      // REFUNDED status excluded; PARTIALLY_REFUNDED would count net
      expect(result.lifetimeValueUsd).toBe(200)
      expect(result.totalOrders).toBe(2)
      expect(result.addresses).toHaveLength(1)
      expect(result.orders.map((order) => order.id)).toEqual(['o1', 'o2'])
    })
  })
})

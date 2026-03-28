import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}

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
})

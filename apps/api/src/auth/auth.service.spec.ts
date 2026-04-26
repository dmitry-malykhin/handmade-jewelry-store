import * as crypto from 'crypto'
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { EmailService } from '../email/email.service'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

const mockBcryptHash = jest.fn().mockResolvedValue('hashed_value')
const mockBcryptCompare = jest.fn()
jest.mock('bcrypt', () => ({
  hash: (...args: unknown[]) => mockBcryptHash(...args),
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
}))

const MOCK_TOKEN_ID = 'mock-token-id-uuid'

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  passwordResetToken: null,
  passwordResetTokenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockStoredRefreshToken = {
  id: MOCK_TOKEN_ID,
  tokenHash: 'hashed_refresh_token',
  userId: mockUser.id,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
}

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  verifyPassword: jest.fn(),
}

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
}

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test_secret'),
  get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
    if (key === 'FRONTEND_URL') return 'http://localhost:3001'
    if (key === 'JWT_EXPIRES_IN') return defaultValue ?? '15m'
    return defaultValue ?? 'test_value'
  }),
}

const mockEmailService = {
  sendWelcome: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}

const mockPrismaService = {
  user: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn().mockResolvedValue(mockStoredRefreshToken),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue(MOCK_TOKEN_ID as ReturnType<typeof crypto.randomUUID>)
    mockJwtService.signAsync.mockResolvedValue('mock_jwt_token')
    mockPrismaService.refreshToken.create.mockResolvedValue(mockStoredRefreshToken)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
  })

  describe('validateUserCredentials', () => {
    it('returns the user when email and password are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser)
      mockUsersService.verifyPassword.mockResolvedValueOnce(true)

      const result = await authService.validateUserCredentials('test@example.com', 'password123')

      expect(result).toEqual(mockUser)
    })

    it('returns null when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)

      const result = await authService.validateUserCredentials('unknown@example.com', 'password123')

      expect(result).toBeNull()
    })

    it('returns null when password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser)
      mockUsersService.verifyPassword.mockResolvedValueOnce(false)

      const result = await authService.validateUserCredentials('test@example.com', 'wrong_password')

      expect(result).toBeNull()
    })
  })

  describe('register', () => {
    it('creates user, creates RefreshToken record, and returns token pair', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)
      mockUsersService.createUser.mockResolvedValueOnce(mockUser)

      const result = await authService.register('new@example.com', 'password123')

      expect(mockUsersService.createUser).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: MOCK_TOKEN_ID, userId: mockUser.id }),
        }),
      )
      expect(result).toEqual({ accessToken: 'mock_jwt_token', refreshToken: 'mock_jwt_token' })
    })

    it('sends welcome email after creating a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)
      mockUsersService.createUser.mockResolvedValueOnce(mockUser)

      await authService.register('new@example.com', 'password123')

      await new Promise((resolve) => setImmediate(resolve))
      expect(mockEmailService.sendWelcome).toHaveBeenCalledWith({
        recipientEmail: mockUser.email,
      })
    })

    it('throws ConflictException when email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser)

      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('login', () => {
    it('returns token pair and creates a RefreshToken record', async () => {
      const result = await authService.login(mockUser)

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled()
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })
  })

  describe('refreshTokens', () => {
    it('returns new token pair when refresh token is valid', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce(mockStoredRefreshToken)
      mockBcryptCompare.mockResolvedValueOnce(true)
      mockUsersService.findById.mockResolvedValueOnce(mockUser)

      const result = await authService.refreshTokens(mockUser.id, MOCK_TOKEN_ID, 'valid_raw_token')

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: MOCK_TOKEN_ID },
      })
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('throws UnauthorizedException when the token record does not exist', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce(null)

      await expect(
        authService.refreshTokens(mockUser.id, 'nonexistent-id', 'any_token'),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when the token belongs to a different user', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        ...mockStoredRefreshToken,
        userId: 'different-user-id',
      })

      await expect(
        authService.refreshTokens(mockUser.id, MOCK_TOKEN_ID, 'any_token'),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('deletes the expired token and throws UnauthorizedException when token is expired', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
        ...mockStoredRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      })

      await expect(
        authService.refreshTokens(mockUser.id, MOCK_TOKEN_ID, 'any_token'),
      ).rejects.toThrow(UnauthorizedException)
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: MOCK_TOKEN_ID },
      })
    })

    it('revokes ALL sessions and throws UnauthorizedException on token reuse', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce(mockStoredRefreshToken)
      mockBcryptCompare.mockResolvedValueOnce(false)

      await expect(
        authService.refreshTokens(mockUser.id, MOCK_TOKEN_ID, 'stolen_old_token'),
      ).rejects.toThrow(UnauthorizedException)
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
    })
  })

  describe('logout', () => {
    it('deletes only the specific session token, leaving other sessions intact', async () => {
      await authService.logout(mockUser.id, MOCK_TOKEN_ID)

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { id: MOCK_TOKEN_ID, userId: mockUser.id },
      })
    })
  })

  describe('forgotPassword', () => {
    it('saves hashed reset token and sends email when user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser)
      mockPrismaService.user.update.mockResolvedValueOnce(mockUser)

      await authService.forgotPassword('test@example.com')

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            passwordResetToken: 'hashed_value',
            passwordResetTokenAt: expect.any(Date),
          }),
        }),
      )
      await new Promise((resolve) => setImmediate(resolve))
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'test@example.com',
          resetToken: MOCK_TOKEN_ID,
        }),
      )
    })

    it('returns void without error when email is not registered', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)

      await expect(authService.forgotPassword('unknown@example.com')).resolves.toBeUndefined()
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    it('updates password, clears reset token, and revokes all sessions', async () => {
      const userWithResetToken = {
        ...mockUser,
        passwordResetToken: 'hashed_reset_token',
        passwordResetTokenAt: new Date(),
      }
      mockPrismaService.user.findMany.mockResolvedValueOnce([userWithResetToken])
      mockBcryptCompare.mockResolvedValueOnce(true)
      mockPrismaService.$transaction.mockResolvedValueOnce(undefined)

      await authService.resetPassword('plain-uuid-token', 'new_secure_password')

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1)
      // Verify both operations were issued (password update + all-sessions revocation)
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ passwordResetToken: null }),
        }),
      )
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
    })

    it('throws BadRequestException when no candidate matches the token', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([
        { ...mockUser, passwordResetToken: 'hashed_other_token', passwordResetTokenAt: new Date() },
      ])
      mockBcryptCompare.mockResolvedValueOnce(false)

      await expect(authService.resetPassword('wrong_token', 'new_password')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('throws BadRequestException when no candidates with valid reset tokens exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([])

      await expect(authService.resetPassword('any_token', 'new_password')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('changePassword', () => {
    it('updates password and revokes all sessions when current password is correct', async () => {
      mockUsersService.findById.mockResolvedValueOnce(mockUser)
      mockUsersService.verifyPassword.mockResolvedValueOnce(true)
      mockPrismaService.$transaction.mockResolvedValueOnce(undefined)

      await authService.changePassword(mockUser.id, 'current_password', 'NewStrong123')

      expect(mockUsersService.verifyPassword).toHaveBeenCalledWith(
        'current_password',
        mockUser.password,
      )
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'hashed_value' },
      })
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
    })

    it('throws UnauthorizedException when current password is incorrect', async () => {
      mockUsersService.findById.mockResolvedValueOnce(mockUser)
      mockUsersService.verifyPassword.mockResolvedValueOnce(false)

      await expect(
        authService.changePassword(mockUser.id, 'wrong_password', 'NewStrong123'),
      ).rejects.toThrow(UnauthorizedException)
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('throws UnauthorizedException when user is not found', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null)

      await expect(
        authService.changePassword('non-existent-id', 'pwd', 'NewStrong123'),
      ).rejects.toThrow(UnauthorizedException)
    })
  })
})

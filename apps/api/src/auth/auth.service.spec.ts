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

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  refreshToken: 'hashed_refresh_token',
  passwordResetToken: null,
  passwordResetTokenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  verifyPassword: jest.fn(),
  saveRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
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
  $transaction: jest.fn(),
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('plain-uuid-token' as ReturnType<typeof crypto.randomUUID>)
    mockJwtService.signAsync.mockResolvedValue('mock_jwt_token')

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
    it('creates user and returns accessToken and refreshToken', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)
      mockUsersService.createUser.mockResolvedValueOnce(mockUser)
      mockUsersService.saveRefreshToken.mockResolvedValueOnce(undefined)

      const result = await authService.register('new@example.com', 'password123')

      expect(mockUsersService.createUser).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(result).toEqual({ accessToken: 'mock_jwt_token', refreshToken: 'mock_jwt_token' })
    })

    it('sends welcome email after creating a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)
      mockUsersService.createUser.mockResolvedValueOnce(mockUser)
      mockUsersService.saveRefreshToken.mockResolvedValueOnce(undefined)

      await authService.register('new@example.com', 'password123')

      // Allow async fire-and-forget to settle
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
    it('returns accessToken and refreshToken for a valid user', async () => {
      mockUsersService.saveRefreshToken.mockResolvedValueOnce(undefined)

      const result = await authService.login(mockUser)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })
  })

  describe('refreshTokens', () => {
    it('returns new token pair when refresh token is valid', async () => {
      mockUsersService.findById.mockResolvedValueOnce(mockUser)
      mockBcryptCompare.mockResolvedValueOnce(true)
      mockUsersService.saveRefreshToken.mockResolvedValueOnce(undefined)

      const result = await authService.refreshTokens(mockUser.id, 'valid_refresh_token')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    it('throws UnauthorizedException when user has no stored refresh token', async () => {
      mockUsersService.findById.mockResolvedValueOnce({ ...mockUser, refreshToken: null })

      await expect(authService.refreshTokens(mockUser.id, 'any_token')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('clears token and throws UnauthorizedException on token reuse', async () => {
      mockUsersService.findById.mockResolvedValueOnce(mockUser)
      mockBcryptCompare.mockResolvedValueOnce(false)
      mockUsersService.clearRefreshToken.mockResolvedValueOnce(undefined)

      await expect(authService.refreshTokens(mockUser.id, 'stolen_old_token')).rejects.toThrow(
        UnauthorizedException,
      )
      expect(mockUsersService.clearRefreshToken).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('logout', () => {
    it('clears the stored refresh token for the user', async () => {
      mockUsersService.clearRefreshToken.mockResolvedValueOnce(undefined)

      await authService.logout(mockUser.id)

      expect(mockUsersService.clearRefreshToken).toHaveBeenCalledWith(mockUser.id)
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
          resetToken: 'plain-uuid-token',
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
    it('updates password and clears tokens when token matches a valid candidate', async () => {
      const userWithResetToken = {
        ...mockUser,
        passwordResetToken: 'hashed_reset_token',
        passwordResetTokenAt: new Date(),
      }
      mockPrismaService.user.findMany.mockResolvedValueOnce([userWithResetToken])
      mockBcryptCompare.mockResolvedValueOnce(true)
      mockPrismaService.$transaction.mockResolvedValueOnce(undefined)

      await authService.resetPassword('plain-uuid-token', 'new_secure_password')

      expect(mockPrismaService.$transaction).toHaveBeenCalled()
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
})

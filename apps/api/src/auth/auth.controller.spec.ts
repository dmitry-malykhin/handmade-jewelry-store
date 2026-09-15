import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  tokenId: 'mock-token-id',
  passwordResetToken: null,
  emailVerifiedAt: new Date(),
  emailVerificationToken: null,
  emailVerificationTokenAt: null,
  passwordResetTokenAt: null,
  loyaltyBalance: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTokens = { accessToken: 'access_token_abc', refreshToken: 'refresh_token_xyz' }

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/auth')
  await $allureSubSuite('auth.controller')
  await $allureSeverity('normal')
})

describe('AuthController', () => {
  let authController: AuthController

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile()

    authController = module.get<AuthController>(AuthController)
  })

  function buildMockResponse() {
    return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Parameters<
      typeof authController.login
    >[2]
  }

  describe('register', () => {
    it('calls authService.register and returns just the email (no session started)', async () => {
      mockAuthService.register.mockResolvedValueOnce({ email: 'new@example.com' })

      const result = await authController.register({
        email: 'new@example.com',
        password: 'password123',
      })

      expect(mockAuthService.register).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(result).toEqual({ email: 'new@example.com' })
    })
  })

  describe('verify-email', () => {
    it('delegates to authService.verifyEmail with the token and returns { verified: true }', async () => {
      mockAuthService.verifyEmail.mockResolvedValueOnce(undefined)

      const result = await authController.verifyEmail({ token: 'plain-verify-token' })

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('plain-verify-token')
      expect(result).toEqual({ verified: true })
    })
  })

  describe('resend-verification', () => {
    it('delegates to authService.resendVerificationEmail with the email', async () => {
      mockAuthService.resendVerificationEmail.mockResolvedValueOnce(undefined)

      const result = await authController.resendVerification({ email: 'test@example.com' })

      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith('test@example.com')
      expect(result).toEqual({ status: 'ok' })
    })
  })

  describe('login', () => {
    it('calls authService.login and sets refresh cookie', async () => {
      mockAuthService.login.mockResolvedValueOnce(mockTokens)
      const response = buildMockResponse()

      const result = await authController.login(
        mockUser,
        { email: mockUser.email, password: 'password123' },
        response,
      )

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(mockTokens)
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      )
    })
  })

  describe('refresh', () => {
    it('calls authService.refreshTokens and re-sets refresh cookie (rotation)', async () => {
      mockAuthService.refreshTokens.mockResolvedValueOnce(mockTokens)
      const response = buildMockResponse()

      const refreshPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
        tokenId: 'mock-token-id',
        refreshToken: 'old_raw_refresh_token',
      }
      const result = await authController.refresh(refreshPayload, response)

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        mockUser.id,
        'mock-token-id',
        'old_raw_refresh_token',
      )
      expect(result).toEqual(mockTokens)
      expect(response.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      )
    })
  })

  describe('logout', () => {
    it('calls authService.logout and clears refresh cookie', async () => {
      mockAuthService.logout.mockResolvedValueOnce(undefined)
      const response = buildMockResponse()

      await authController.logout(mockUser, response)

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id, mockUser.tokenId)
      expect(response.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth' })
    })
  })

  describe('me', () => {
    it('returns the authenticated user without the password field', () => {
      const result = authController.me(mockUser)

      expect(result).not.toHaveProperty('password')
      expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email, role: mockUser.role })
    })

    it('does not mutate the original user object', () => {
      authController.me(mockUser)

      expect(mockUser.password).toBe('hashed_password')
    })

    it('strips passwordResetToken and passwordResetTokenAt even when populated', () => {
      const userWithReset = {
        ...mockUser,
        passwordResetToken: '$2b$10$hashed_reset_token',
        passwordResetTokenAt: new Date('2026-01-01T00:00:00Z'),
      }

      const result = authController.me(userWithReset)

      expect(result).not.toHaveProperty('passwordResetToken')
      expect(result).not.toHaveProperty('passwordResetTokenAt')
      expect(result).not.toHaveProperty('password')
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTokens = { accessToken: 'access_token_abc', refreshToken: 'refresh_token_xyz' }

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
}

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

  describe('register', () => {
    it('calls authService.register with email and password from DTO', async () => {
      mockAuthService.register.mockResolvedValueOnce(mockTokens)

      const result = await authController.register({
        email: 'new@example.com',
        password: 'password123',
      })

      expect(mockAuthService.register).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(result).toEqual(mockTokens)
    })
  })

  describe('login', () => {
    it('calls authService.login with the authenticated user from LocalAuthGuard', async () => {
      mockAuthService.login.mockResolvedValueOnce(mockTokens)

      const result = await authController.login(mockUser, {
        email: mockUser.email,
        password: 'password123',
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(mockTokens)
    })
  })

  describe('refresh', () => {
    it('calls authService.refreshTokens with userId and refresh token from payload', async () => {
      mockAuthService.refreshTokens.mockResolvedValueOnce(mockTokens)

      const refreshPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.USER,
        refreshToken: 'old_refresh_token',
      }
      const result = await authController.refresh(refreshPayload)

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(mockUser.id, 'old_refresh_token')
      expect(result).toEqual(mockTokens)
    })
  })

  describe('logout', () => {
    it('calls authService.logout with the authenticated user id', async () => {
      mockAuthService.logout.mockResolvedValueOnce(undefined)

      await authController.logout(mockUser)

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id)
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
  })
})

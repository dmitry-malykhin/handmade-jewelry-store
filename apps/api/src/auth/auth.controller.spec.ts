import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
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
      mockAuthService.register.mockResolvedValueOnce({ accessToken: 'token_123' })

      const result = await authController.register({
        email: 'new@example.com',
        password: 'password123',
      })

      expect(mockAuthService.register).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(result).toEqual({ accessToken: 'token_123' })
    })
  })

  describe('login', () => {
    it('calls authService.login with the authenticated user from LocalAuthGuard', () => {
      mockAuthService.login.mockReturnValueOnce({ accessToken: 'token_456' })

      const result = authController.login(mockUser, {
        email: mockUser.email,
        password: 'password123',
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual({ accessToken: 'token_456' })
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

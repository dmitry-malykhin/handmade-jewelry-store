import { ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

const mockUser = {
  id: 'user_test_1',
  email: 'test@example.com',
  password: 'hashed_password',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  verifyPassword: jest.fn(),
}

const mockJwtService = {
  sign: jest.fn(() => 'mock_jwt_token'),
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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
    it('creates user and returns an accessToken', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null)
      mockUsersService.createUser.mockResolvedValueOnce(mockUser)

      const result = await authService.register('new@example.com', 'password123')

      expect(mockUsersService.createUser).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(result).toEqual({ accessToken: 'mock_jwt_token' })
    })

    it('throws ConflictException when email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser)

      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('login', () => {
    it('returns an accessToken for a valid user', () => {
      const result = authService.login(mockUser)

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id, email: mockUser.email }),
      )
      expect(result).toEqual({ accessToken: 'mock_jwt_token' })
    })
  })
})

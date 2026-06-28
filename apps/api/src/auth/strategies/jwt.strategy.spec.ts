import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Role } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { UsersService } from '../../users/users.service'
import { JwtPayload, JwtStrategy } from './jwt.strategy'

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-secret' : '')),
} as unknown as ConfigService

const mockUsersService = {
  findById: jest.fn(),
} as unknown as UsersService

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/auth')
  await $allureSubSuite('jwt.strategy')
  await $allureSeverity('critical')
})

describe('JwtStrategy.validate()', () => {
  let strategy: JwtStrategy

  beforeEach(() => {
    jest.clearAllMocks()
    strategy = new JwtStrategy(mockConfigService, mockUsersService)
  })

  it('returns the user enriched with tokenId when findById resolves a user', async () => {
    const user = { id: 'u1', email: 'a@b.com', role: Role.USER }
    ;(mockUsersService.findById as jest.Mock).mockResolvedValue(user)

    const payload: JwtPayload = {
      sub: 'u1',
      email: 'a@b.com',
      role: Role.USER,
      tokenId: 'tok-1',
    }
    const result = await strategy.validate(payload)

    expect(mockUsersService.findById).toHaveBeenCalledWith('u1')
    expect(result).toEqual({ ...user, tokenId: 'tok-1' })
  })

  it('throws UnauthorizedException when findById returns null (deleted/disabled user)', async () => {
    ;(mockUsersService.findById as jest.Mock).mockResolvedValue(null)

    const payload: JwtPayload = {
      sub: 'u-missing',
      email: 'x@b.com',
      role: Role.USER,
      tokenId: 'tok-1',
    }

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

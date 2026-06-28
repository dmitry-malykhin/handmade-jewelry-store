import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Role } from '@prisma/client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { UsersService } from '../../users/users.service'
import { JwtRefreshStrategy } from './jwt-refresh.strategy'
import type { JwtPayload } from './jwt.strategy'

const mockConfigService = {
  getOrThrow: jest.fn(() => 'test-refresh-secret'),
} as unknown as ConfigService

const mockUsersService = {} as UsersService

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/auth')
  await $allureSubSuite('jwt-refresh.strategy')
  await $allureSeverity('critical')
})

describe('JwtRefreshStrategy.validate()', () => {
  let strategy: JwtRefreshStrategy
  const payload: JwtPayload = {
    sub: 'u1',
    email: 'a@b.com',
    role: Role.USER,
    tokenId: 'tok-1',
  }

  beforeEach(() => {
    strategy = new JwtRefreshStrategy(mockConfigService, mockUsersService)
  })

  it('extracts the bearer token from the Authorization header and returns payload + raw refreshToken', async () => {
    const request = { headers: { authorization: 'Bearer raw-refresh-xyz' } }

    const result = await strategy.validate(request, payload)

    expect(result).toEqual({ ...payload, refreshToken: 'raw-refresh-xyz' })
  })

  it('returns empty refreshToken when Authorization header is missing', async () => {
    const request = { headers: {} }

    const result = await strategy.validate(request, payload)

    expect(result.refreshToken).toBe('')
  })

  it('throws UnauthorizedException for legacy tokens without tokenId', async () => {
    const request = { headers: { authorization: 'Bearer x' } }
    const legacyPayload = { ...payload, tokenId: '' } as JwtPayload

    await expect(strategy.validate(request, legacyPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})

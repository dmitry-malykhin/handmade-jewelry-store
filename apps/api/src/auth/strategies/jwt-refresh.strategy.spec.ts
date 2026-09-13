import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { UsersService } from '../../users/users.service'
import { JwtRefreshStrategy } from './jwt-refresh.strategy'
import type { JwtPayload } from './jwt.strategy'

function buildRequest(overrides: {
  cookies?: Record<string, string>
  headers?: Record<string, string>
}): Request {
  return {
    cookies: overrides.cookies ?? {},
    headers: overrides.headers ?? {},
  } as unknown as Request
}

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

  it('extracts the refresh token from the HttpOnly cookie (preferred path)', async () => {
    const request = buildRequest({ cookies: { refreshToken: 'raw-refresh-from-cookie' } })

    const result = await strategy.validate(request, payload)

    expect(result).toEqual({ ...payload, refreshToken: 'raw-refresh-from-cookie' })
  })

  it('falls back to Authorization header when cookie is absent (legacy client path)', async () => {
    const request = buildRequest({ headers: { authorization: 'Bearer raw-refresh-xyz' } })

    const result = await strategy.validate(request, payload)

    expect(result.refreshToken).toBe('raw-refresh-xyz')
  })

  it('prefers cookie over Authorization header when both provided', async () => {
    const request = buildRequest({
      cookies: { refreshToken: 'cookie-wins' },
      headers: { authorization: 'Bearer header-loses' },
    })

    const result = await strategy.validate(request, payload)

    expect(result.refreshToken).toBe('cookie-wins')
  })

  it('returns empty refreshToken when neither cookie nor Authorization header present', async () => {
    const request = buildRequest({})

    const result = await strategy.validate(request, payload)

    expect(result.refreshToken).toBe('')
  })

  it('throws UnauthorizedException for legacy tokens without tokenId', async () => {
    const request = buildRequest({ headers: { authorization: 'Bearer x' } })
    const legacyPayload = { ...payload, tokenId: '' } as JwtPayload

    await expect(strategy.validate(request, legacyPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})

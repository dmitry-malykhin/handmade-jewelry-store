import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
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

// Guards the `algorithms: ['HS256']` pin in jwt-refresh.strategy.ts. Deleting
// the pin would silently let an attacker swap HS256 for HS384/HS512 (header
// manipulation) and have the refresh verifier accept the token — this suite
// flips red the moment the pin is removed.
describe('JwtRefreshStrategy — JWT algorithm pin (regression for #564)', () => {
  const refreshSecret = 'test-refresh-secret'
  const payload: JwtPayload = {
    sub: 'u1',
    email: 'a@b.com',
    role: Role.USER,
    tokenId: 'tok-1',
  }

  it('rejects a refresh token signed with HS384 under HS256-only pin', () => {
    const signer = new JwtService({ secret: refreshSecret, signOptions: { algorithm: 'HS384' } })
    const wrongAlgRefresh = signer.sign(payload)
    const verifier = new JwtService({ secret: refreshSecret })

    expect(() => verifier.verify(wrongAlgRefresh, { algorithms: ['HS256'] })).toThrow(
      /invalid algorithm/i,
    )
  })

  it('rejects an alg=none refresh token even when verifier shares the empty secret', () => {
    const signer = new JwtService({ secret: '', signOptions: { algorithm: 'none' } })
    const unsignedRefresh = signer.sign(payload)
    const verifier = new JwtService({ secret: refreshSecret })

    expect(() => verifier.verify(unsignedRefresh, { algorithms: ['HS256'] })).toThrow()
  })

  it('still accepts an HS256-signed refresh token (positive control)', () => {
    const signer = new JwtService({ secret: refreshSecret })
    const rightAlgRefresh = signer.sign(payload)
    const verifier = new JwtService({ secret: refreshSecret })

    expect(() => verifier.verify(rightAlgRefresh, { algorithms: ['HS256'] })).not.toThrow()
  })

  // Source-pin: anchors the library-contract tests above to the production
  // strategy file. If the `algorithms: ['HS256']` line is removed from
  // jwt-refresh.strategy.ts (or commented out), this assertion flips red.
  it("jwt-refresh.strategy.ts source still pins algorithms: ['HS256']", () => {
    const raw = readFileSync(resolve(__dirname, 'jwt-refresh.strategy.ts'), 'utf8')
    const source = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(source).toMatch(/algorithms:\s*\['HS256'\]/)
  })
})

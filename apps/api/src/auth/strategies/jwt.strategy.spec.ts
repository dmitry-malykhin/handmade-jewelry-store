import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
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

// Guards the `algorithms: ['HS256']` pin in jwt.strategy.ts. Delete the pin and
// this suite flips red — alg-confusion (CVE-2015-9235 class) + alg=none remain
// blocked.
describe('JwtStrategy — JWT algorithm pin (regression for #564)', () => {
  const payload: JwtPayload = {
    sub: 'u1',
    email: 'a@b.com',
    role: Role.USER,
    tokenId: 'tok-1',
  }
  const sameSecret = 'test-secret'

  it('rejects a token signed with HS384 when verifier only accepts HS256', () => {
    const signer = new JwtService({ secret: sameSecret, signOptions: { algorithm: 'HS384' } })
    const wrongAlgToken = signer.sign(payload)
    const verifier = new JwtService({ secret: sameSecret })

    expect(() => verifier.verify(wrongAlgToken, { algorithms: ['HS256'] })).toThrow(
      /invalid algorithm/i,
    )
  })

  it('rejects an unsigned alg=none token even when the secret is empty-matched', () => {
    const signer = new JwtService({ secret: '', signOptions: { algorithm: 'none' } })
    const unsignedToken = signer.sign(payload)
    const verifier = new JwtService({ secret: sameSecret })

    expect(() => verifier.verify(unsignedToken, { algorithms: ['HS256'] })).toThrow()
  })

  it('still accepts an HS256-signed token under the same pin (positive control)', () => {
    const signer = new JwtService({ secret: sameSecret })
    const rightAlgToken = signer.sign(payload)
    const verifier = new JwtService({ secret: sameSecret })

    expect(() => verifier.verify(rightAlgToken, { algorithms: ['HS256'] })).not.toThrow()
  })

  // Source-pin: the JwtService tests above cover the library contract; this
  // one anchors the contract to the production strategy file so deleting or
  // commenting out the `algorithms: ['HS256']` line turns the suite red.
  it("jwt.strategy.ts source still pins algorithms: ['HS256']", () => {
    const raw = readFileSync(resolve(__dirname, 'jwt.strategy.ts'), 'utf8')
    const source = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(source).toMatch(/algorithms:\s*\['HS256'\]/)
  })
})

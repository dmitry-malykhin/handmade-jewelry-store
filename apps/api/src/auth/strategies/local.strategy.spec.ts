import { UnauthorizedException } from '@nestjs/common'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AuthService } from '../auth.service'
import { LocalStrategy } from './local.strategy'

const mockAuthService = {
  validateUserCredentials: jest.fn(),
} as unknown as AuthService

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/auth')
  await $allureSubSuite('local.strategy')
  await $allureSeverity('critical')
})

describe('LocalStrategy.validate()', () => {
  let strategy: LocalStrategy

  beforeEach(() => {
    jest.clearAllMocks()
    strategy = new LocalStrategy(mockAuthService)
  })

  it('returns the user when AuthService.validateUserCredentials approves', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    ;(mockAuthService.validateUserCredentials as jest.Mock).mockResolvedValue(user)

    const result = await strategy.validate('a@b.com', 'pass1234')

    expect(mockAuthService.validateUserCredentials).toHaveBeenCalledWith('a@b.com', 'pass1234')
    expect(result).toBe(user)
  })

  it('throws UnauthorizedException when credentials are rejected (null user)', async () => {
    ;(mockAuthService.validateUserCredentials as jest.Mock).mockResolvedValue(null)

    await expect(strategy.validate('a@b.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})

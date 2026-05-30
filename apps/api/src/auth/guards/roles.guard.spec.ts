import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { RolesGuard } from './roles.guard'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

function buildMockExecutionContext(userRole: Role | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole !== null ? { role: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/auth')
  await $allureSubSuite('roles.guard')
  await $allureSeverity('normal')
})

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    rolesGuard = new RolesGuard(reflector)
  })

  it('allows access when no @Roles() decorator is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const executionContext = buildMockExecutionContext(Role.USER)

    expect(rolesGuard.canActivate(executionContext)).toBe(true)
  })

  it('allows access when @Roles() is set to empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])
    const executionContext = buildMockExecutionContext(Role.USER)

    expect(rolesGuard.canActivate(executionContext)).toBe(true)
  })

  it('allows access when user role matches required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN])
    const executionContext = buildMockExecutionContext(Role.ADMIN)

    expect(rolesGuard.canActivate(executionContext)).toBe(true)
  })

  it('denies access when user role does not match required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN])
    const executionContext = buildMockExecutionContext(Role.USER)

    expect(rolesGuard.canActivate(executionContext)).toBe(false)
  })

  it('allows access when user role is one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.USER, Role.ADMIN])
    const executionContext = buildMockExecutionContext(Role.USER)

    expect(rolesGuard.canActivate(executionContext)).toBe(true)
  })

  it('denies access when user role is not in the required roles list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN])
    const executionContext = buildMockExecutionContext(Role.USER)

    expect(rolesGuard.canActivate(executionContext)).toBe(false)
  })
})

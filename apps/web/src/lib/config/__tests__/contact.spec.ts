import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { getPrivacyEmail, getSupportEmail, getLegalEmail, getCompanyAddress } from '../contact'

const ENV_KEYS = [
  'NEXT_PUBLIC_PRIVACY_EMAIL',
  'NEXT_PUBLIC_SUPPORT_EMAIL',
  'NEXT_PUBLIC_LEGAL_EMAIL',
  'NEXT_PUBLIC_COMPANY_ADDRESS',
] as const

const originalEnv: Record<string, string | undefined> = {}

beforeEach(async () => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key]
    delete process.env[key]
  }
  if (!process.env.CI) return
  await $allureSuite('web/lib/config')
  await $allureSubSuite('contact')
  await $allureSeverity('critical')
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getPrivacyEmail / getSupportEmail / getLegalEmail', () => {
  it('returns the env-configured address, trimmed', () => {
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL = '  privacy@senichka.com  '
    expect(getPrivacyEmail()).toBe('privacy@senichka.com')
  })

  it('routes each getter to its own env var — no cross-wiring', () => {
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL = 'p@x.com'
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 's@x.com'
    process.env.NEXT_PUBLIC_LEGAL_EMAIL = 'l@x.com'
    expect(getPrivacyEmail()).toBe('p@x.com')
    expect(getSupportEmail()).toBe('s@x.com')
    expect(getLegalEmail()).toBe('l@x.com')
  })

  it('falls back to a *.local dev address in non-production (never @example.com)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fallback = getSupportEmail()
    expect(fallback).toMatch(/@handmade-jewelry\.local$/)
    expect(fallback).not.toContain('@example.com')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('throws in production when the env var is missing — placeholder would invalidate the policy', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => getPrivacyEmail()).toThrow(/NEXT_PUBLIC_PRIVACY_EMAIL is not set/)
    expect(() => getSupportEmail()).toThrow(/NEXT_PUBLIC_SUPPORT_EMAIL is not set/)
    expect(() => getLegalEmail()).toThrow(/NEXT_PUBLIC_LEGAL_EMAIL is not set/)
  })

  it('throws in production when the env var is only whitespace', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.NEXT_PUBLIC_LEGAL_EMAIL = '   '
    expect(() => getLegalEmail()).toThrow(/NEXT_PUBLIC_LEGAL_EMAIL is not set/)
  })
})

describe('getCompanyAddress', () => {
  it('returns the env-configured address, trimmed', () => {
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS = '  123 Main St, Austin, TX  '
    expect(getCompanyAddress()).toBe('123 Main St, Austin, TX')
  })

  it('returns an empty string when the env var is unset (does not throw in prod)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(getCompanyAddress()).toBe('')
  })
})

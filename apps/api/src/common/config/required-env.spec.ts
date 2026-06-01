import { assertProductionEnv, validateRequiredEnv } from './required-env'

/** Build a complete env that passes validation, minus whatever the test removes. */
function buildValidProdEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@host:5432/db',
    JWT_SECRET: 'long-secret',
    JWT_REFRESH_SECRET: 'another-long-secret',
    STRIPE_SECRET_KEY: 'sk_live_xxx',
    STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
    RESEND_API_KEY: 're_xxx',
    RESEND_FROM_ADDRESS: 'orders@senichka.com',
    STORE_OWNER_EMAIL: 'owner@senichka.com',
    FRONTEND_URL: 'https://senichka.com',
    AWS_S3_BUCKET: 'senichka-images',
    AWS_ACCESS_KEY_ID: 'AKIA…',
    AWS_SECRET_ACCESS_KEY: '…',
    AWS_S3_PUBLIC_URL_PREFIX: 'https://cdn.senichka.com',
  }
}

describe('validateRequiredEnv', () => {
  it('returns no missing entries for a complete production env', () => {
    const report = validateRequiredEnv(buildValidProdEnv())
    expect(report.missing).toHaveLength(0)
  })

  it('lists every missing required var with a description', () => {
    const env = buildValidProdEnv()
    delete env.STRIPE_SECRET_KEY
    delete env.RESEND_FROM_ADDRESS

    const report = validateRequiredEnv(env)
    const names = report.missing.map((m) => m.name)
    expect(names).toEqual(expect.arrayContaining(['STRIPE_SECRET_KEY', 'RESEND_FROM_ADDRESS']))
    expect(report.missing.every((m) => m.description.length > 0)).toBe(true)
  })

  it('treats empty strings as missing (whitespace counts as empty)', () => {
    const env = buildValidProdEnv()
    env.JWT_SECRET = '   '

    const report = validateRequiredEnv(env)
    expect(report.missing.map((m) => m.name)).toContain('JWT_SECRET')
  })

  it('warns when FRONTEND_URL is localhost — likely deploy mistake', () => {
    const env = buildValidProdEnv()
    env.FRONTEND_URL = 'http://localhost:3000'

    const report = validateRequiredEnv(env)
    expect(report.warnings.some((w) => w.includes('localhost'))).toBe(true)
  })

  it('warns when recommended vars (SENTRY_DSN, POSTHOG_API_KEY) are unset', () => {
    const env = buildValidProdEnv()
    // Recommended vars are not in the valid-env builder, so they're already missing.
    const report = validateRequiredEnv(env)
    expect(report.warnings.some((w) => w.includes('SENTRY_DSN'))).toBe(true)
    expect(report.warnings.some((w) => w.includes('POSTHOG_API_KEY'))).toBe(true)
  })
})

describe('assertProductionEnv', () => {
  let mockLogger: { warn: jest.Mock; error: jest.Mock }

  beforeEach(() => {
    mockLogger = { warn: jest.fn(), error: jest.fn() }
  })

  it('is a no-op in non-production environments', () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'development' }
    expect(() => assertProductionEnv(env, mockLogger)).not.toThrow()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('throws and logs a single block listing every missing var in production', () => {
    const env = buildValidProdEnv()
    delete env.STRIPE_SECRET_KEY
    delete env.RESEND_API_KEY

    expect(() => assertProductionEnv(env, mockLogger)).toThrow(/missing in production/)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    const errorMessage = String(mockLogger.error.mock.calls[0]?.[0])
    expect(errorMessage).toContain('STRIPE_SECRET_KEY')
    expect(errorMessage).toContain('RESEND_API_KEY')
    expect(errorMessage).toContain('Set them via your deploy platform')
  })

  it('emits recommended-var warnings even when required vars all pass', () => {
    const env = buildValidProdEnv()
    expect(() => assertProductionEnv(env, mockLogger)).not.toThrow()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('emits the FRONTEND_URL localhost warning in production', () => {
    const env = buildValidProdEnv()
    env.FRONTEND_URL = 'http://localhost:3000'

    expect(() => assertProductionEnv(env, mockLogger)).not.toThrow()
    const allWarnings = mockLogger.warn.mock.calls.map((args) => String(args[0]))
    expect(allWarnings.some((w) => w.includes('localhost'))).toBe(true)
  })
})

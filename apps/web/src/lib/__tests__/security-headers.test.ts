import { describe, it, expect } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { getSecurityHeaders } from '../security-headers'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib')
  await $allureSubSuite('security-headers')
  await $allureSeverity('critical')
})

function getHeader(headers: Array<{ key: string; value: string }>, key: string) {
  return headers.find((header) => header.key === key)
}

describe('getSecurityHeaders — baseline (every environment)', () => {
  it.each(['development', 'test', 'production', undefined])(
    'always emits X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (NODE_ENV=%s)',
    (nodeEnv) => {
      const headers = getSecurityHeaders(nodeEnv)
      expect(getHeader(headers, 'X-Content-Type-Options')?.value).toBe('nosniff')
      expect(getHeader(headers, 'X-Frame-Options')?.value).toBe('SAMEORIGIN')
      expect(getHeader(headers, 'Referrer-Policy')?.value).toBe('strict-origin-when-cross-origin')
      expect(getHeader(headers, 'Permissions-Policy')?.value).toContain('camera=()')
    },
  )
})

describe('getSecurityHeaders — production-only headers', () => {
  it('emits HSTS with 2-year max-age + includeSubDomains + preload', () => {
    const hsts = getHeader(getSecurityHeaders('production'), 'Strict-Transport-Security')
    expect(hsts?.value).toBe('max-age=63072000; includeSubDomains; preload')
  })

  it('emits Content-Security-Policy with all required directives', () => {
    const csp = getHeader(getSecurityHeaders('production'), 'Content-Security-Policy')?.value ?? ''

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('script-src')
    expect(csp).toContain('connect-src')
    expect(csp).toContain("img-src 'self' data: https:")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain('frame-src')
    expect(csp).toContain("worker-src 'self' blob:")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  it.each([
    'https://js.stripe.com',
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://static.klaviyo.com',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
    'https://www.clarity.ms',
  ])('CSP script-src whitelists %s (third-party SDK host)', (host) => {
    const csp = getHeader(getSecurityHeaders('production'), 'Content-Security-Policy')?.value ?? ''
    expect(csp).toContain(host)
  })

  it.each(['https://js.stripe.com', 'https://hooks.stripe.com'])(
    'CSP frame-src whitelists %s (Stripe Elements + 3DS challenge)',
    (host) => {
      const csp =
        getHeader(getSecurityHeaders('production'), 'Content-Security-Policy')?.value ?? ''
      expect(csp).toContain(host)
    },
  )

  it('emits Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Resource-Policy: same-site', () => {
    const headers = getSecurityHeaders('production')
    expect(getHeader(headers, 'Cross-Origin-Opener-Policy')?.value).toBe('same-origin')
    expect(getHeader(headers, 'Cross-Origin-Resource-Policy')?.value).toBe('same-site')
  })
})

describe('getSecurityHeaders — non-production environments', () => {
  it.each(['development', 'test', undefined])(
    'does NOT emit HSTS (NODE_ENV=%s) — would brick localhost-over-HTTP for 2 years',
    (nodeEnv) => {
      const headers = getSecurityHeaders(nodeEnv)
      expect(getHeader(headers, 'Strict-Transport-Security')).toBeUndefined()
    },
  )

  it.each(['development', 'test', undefined])(
    'does NOT emit CSP (NODE_ENV=%s) — Next.js HMR uses eval() and inline scripts that fail prod policy',
    (nodeEnv) => {
      const headers = getSecurityHeaders(nodeEnv)
      expect(getHeader(headers, 'Content-Security-Policy')).toBeUndefined()
    },
  )

  it.each(['development', 'test', undefined])(
    'does NOT emit COOP / CORP (NODE_ENV=%s)',
    (nodeEnv) => {
      const headers = getSecurityHeaders(nodeEnv)
      expect(getHeader(headers, 'Cross-Origin-Opener-Policy')).toBeUndefined()
      expect(getHeader(headers, 'Cross-Origin-Resource-Policy')).toBeUndefined()
    },
  )
})

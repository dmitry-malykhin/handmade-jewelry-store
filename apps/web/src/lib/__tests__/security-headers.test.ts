import { describe, it, expect } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyReportOnly,
  buildReportToHeader,
  getSecurityHeaders,
} from '../security-headers'

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

  it('does NOT emit Content-Security-Policy — middleware sets it per-request with nonce', () => {
    expect(getHeader(getSecurityHeaders('production'), 'Content-Security-Policy')).toBeUndefined()
  })

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
    'does NOT emit COOP / CORP (NODE_ENV=%s)',
    (nodeEnv) => {
      const headers = getSecurityHeaders(nodeEnv)
      expect(getHeader(headers, 'Cross-Origin-Opener-Policy')).toBeUndefined()
      expect(getHeader(headers, 'Cross-Origin-Resource-Policy')).toBeUndefined()
    },
  )
})

describe('buildContentSecurityPolicy — with nonce', () => {
  const NONCE = 'abc123RandomBase64'
  function getCsp() {
    return buildContentSecurityPolicy(NONCE)
  }
  function getDirective(name: string): string {
    const found = getCsp()
      .split(';')
      .find((directive) => directive.trim().startsWith(name))
    return found?.trim() ?? ''
  }

  it('all required directives present', () => {
    const csp = getCsp()
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

  it('script-src pins nonce + strict-dynamic (blocks XSS-injected inline scripts)', () => {
    const scriptSrc = getDirective('script-src')
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`)
    expect(scriptSrc).toContain("'strict-dynamic'")
  })

  it("script-src does NOT contain 'unsafe-inline' when nonce is provided", () => {
    expect(getDirective('script-src')).not.toContain("'unsafe-inline'")
  })

  it.each([
    'https://js.stripe.com',
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://static.klaviyo.com',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
    'https://www.clarity.ms',
  ])('script-src still whitelists %s (third-party SDK host)', (host) => {
    expect(getDirective('script-src')).toContain(host)
  })

  it.each(['https://js.stripe.com', 'https://hooks.stripe.com'])(
    'frame-src whitelists %s (Stripe Elements + 3DS challenge)',
    (host) => {
      expect(getDirective('frame-src')).toContain(host)
    },
  )

  describe('connect-src — explicit allowlist (no wildcard schemes)', () => {
    it.each([' http:', ' https:', ' wss:', ' ws:'])(
      'does NOT contain wildcard scheme "%s"',
      (badToken) => {
        const connectSrc = getDirective('connect-src')
        expect(connectSrc).not.toMatch(new RegExp(`${badToken.trim()}\\s|${badToken.trim()}$`))
      },
    )

    it.each([
      'https://us.i.posthog.com',
      'https://www.google-analytics.com',
      'https://www.facebook.com',
      'https://ct.pinterest.com',
      'https://*.clarity.ms',
      'https://*.klaviyo.com',
      'https://api.stripe.com',
      'https://*.ingest.sentry.io',
    ])('whitelists %s (analytics/payment/error ingest)', (host) => {
      expect(getDirective('connect-src')).toContain(host)
    })

    it("includes 'self' as the first allowed source", () => {
      expect(getDirective('connect-src')).toMatch(/^connect-src 'self'/)
    })
  })
})

describe('buildContentSecurityPolicy — without nonce (build-time fallback)', () => {
  it("falls back to 'unsafe-inline' when no nonce is provided (static-header path)", () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain("'nonce-")
  })
})

describe('buildContentSecurityPolicy — reporting directives (#592)', () => {
  const NONCE = 'nonce-value'

  it('both report-uri and report-to are present (one for legacy UAs, one for new UAs)', () => {
    const csp = buildContentSecurityPolicy(NONCE)
    expect(csp).toMatch(/report-uri\s+\S*\/api\/csp-report/)
    expect(csp).toContain('report-to csp-endpoint')
  })

  it('build-time fallback (no nonce) still ships reporting directives — static deploys must capture violations too', () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).toMatch(/report-uri\s+\S*\/api\/csp-report/)
    expect(csp).toContain('report-to csp-endpoint')
  })
})

describe('buildContentSecurityPolicyReportOnly — tightened style-src probe (#592)', () => {
  const NONCE = 'nonce-report-only'
  const getReportOnly = () => buildContentSecurityPolicyReportOnly(NONCE)

  it("drops 'unsafe-inline' from style-src and pins the per-request nonce", () => {
    const csp = getReportOnly()
    expect(csp).toContain(`style-src 'self' 'nonce-${NONCE}'`)
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'")
  })

  it('mirrors every other directive from the enforce policy so results are comparable', () => {
    const csp = getReportOnly()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain(`'nonce-${NONCE}'`)
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  it('ships violations to the same endpoint as the enforce policy', () => {
    const csp = getReportOnly()
    expect(csp).toMatch(/report-uri\s+\S*\/api\/csp-report/)
    expect(csp).toContain('report-to csp-endpoint')
  })
})

describe('buildReportToHeader — Reporting API group (#592)', () => {
  it('is valid JSON with the group name referenced by the report-to CSP directive', () => {
    const parsed = JSON.parse(buildReportToHeader()) as {
      group: string
      max_age: number
      endpoints: Array<{ url: string }>
    }
    expect(parsed.group).toBe('csp-endpoint')
    expect(parsed.max_age).toBeGreaterThan(0)
    expect(parsed.endpoints).toHaveLength(1)
    expect(parsed.endpoints[0]?.url).toMatch(/\/api\/csp-report$/)
  })
})

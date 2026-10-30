import { Test, TestingModule } from '@nestjs/testing'
import * as Sentry from '@sentry/nestjs'
import { CspReportController } from './csp-report.controller'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/security')
  await $allureSubSuite('csp-report.controller')
  await $allureSeverity('normal')
})

const captureMessageSpy = jest.spyOn(Sentry, 'captureMessage').mockReturnValue('mock-event-id')

describe('CspReportController', () => {
  let controller: CspReportController

  beforeEach(async () => {
    captureMessageSpy.mockClear()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CspReportController],
    }).compile()
    controller = module.get(CspReportController)
  })

  afterAll(() => {
    captureMessageSpy.mockRestore()
  })

  describe('legacy report-uri envelope (Content-Type: application/csp-report)', () => {
    it('forwards a single violation to Sentry with directive + disposition tags', () => {
      const body = {
        'csp-report': {
          'document-uri': 'https://senichka.com/en/products/silver-ring',
          'violated-directive': "style-src 'self' 'nonce-abc'",
          'effective-directive': 'style-src',
          'blocked-uri': 'inline',
          'source-file': 'https://senichka.com/en/products/silver-ring',
          'line-number': 42,
          'original-policy': "default-src 'self'; style-src 'self' 'nonce-abc'",
          disposition: 'report',
          'status-code': 200,
        },
      }

      controller.receive(body)

      expect(captureMessageSpy).toHaveBeenCalledTimes(1)
      const [message, context] = captureMessageSpy.mock.calls[0]!
      expect(message).toContain('CSP report: style-src')
      expect(context).toMatchObject({
        level: 'warning',
        tags: { 'csp.directive': 'style-src', 'csp.disposition': 'report' },
        extra: expect.objectContaining({
          blockedUri: 'inline',
          documentUri: 'https://senichka.com/en/products/silver-ring',
          sourceFile: 'https://senichka.com/en/products/silver-ring',
          lineNumber: 42,
        }),
      })
    })

    it('defaults disposition to enforce when absent (older browsers)', () => {
      controller.receive({
        'csp-report': {
          'document-uri': 'https://senichka.com/',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.example/x.js',
        },
      })

      expect(captureMessageSpy).toHaveBeenCalledTimes(1)
      const [message, context] = captureMessageSpy.mock.calls[0]!
      expect(message).toContain('CSP enforce:')
      expect(context).toMatchObject({ tags: { 'csp.disposition': 'enforce' } })
    })
  })

  describe('Reporting API envelope (Content-Type: application/reports+json)', () => {
    it('forwards each csp-violation entry; ignores non-csp report types in the same batch', () => {
      const body = [
        {
          type: 'csp-violation',
          url: 'https://senichka.com/',
          age: 0,
          body: {
            documentURL: 'https://senichka.com/',
            blockedURL: 'https://cdn.evil/x.js',
            effectiveDirective: 'script-src-elem',
            originalPolicy: "default-src 'self'",
            disposition: 'enforce',
            sourceFile: 'https://senichka.com/',
            lineNumber: 10,
          },
        },
        {
          type: 'network-error',
          url: 'https://senichka.com/favicon.ico',
          body: { reason: 'dns.name_not_resolved' },
        },
      ]

      controller.receive(body)

      expect(captureMessageSpy).toHaveBeenCalledTimes(1)
      const [, context] = captureMessageSpy.mock.calls[0]!
      expect(context).toMatchObject({
        tags: { 'csp.directive': 'script-src-elem', 'csp.disposition': 'enforce' },
        extra: expect.objectContaining({
          blockedUri: 'https://cdn.evil/x.js',
          documentUri: 'https://senichka.com/',
          lineNumber: 10,
        }),
      })
    })

    it('is a no-op on an empty batch (browser flushed with nothing to report)', () => {
      controller.receive([])
      expect(captureMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('malformed input', () => {
    it('silently drops a body that is neither array nor { "csp-report": ... }', () => {
      controller.receive({ unexpected: true })
      controller.receive(null)
      controller.receive('string-body')
      expect(captureMessageSpy).not.toHaveBeenCalled()
    })
  })
})

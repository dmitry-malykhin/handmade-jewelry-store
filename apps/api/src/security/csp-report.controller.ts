import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import * as Sentry from '@sentry/nestjs'

interface LegacyCspReportEnvelope {
  'csp-report'?: Record<string, unknown>
}

interface ReportingApiEntry {
  type?: string
  url?: string
  body?: Record<string, unknown>
}

interface NormalisedViolation {
  blockedUri: string
  violatedDirective: string
  effectiveDirective: string
  documentUri: string
  sourceFile?: string
  lineNumber?: number
  originalPolicy?: string
  disposition?: string
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normaliseLegacy(report: Record<string, unknown>): NormalisedViolation {
  return {
    blockedUri: pickString(report['blocked-uri']) ?? 'unknown',
    violatedDirective: pickString(report['violated-directive']) ?? 'unknown',
    effectiveDirective:
      pickString(report['effective-directive']) ??
      pickString(report['violated-directive']) ??
      'unknown',
    documentUri: pickString(report['document-uri']) ?? 'unknown',
    sourceFile: pickString(report['source-file']),
    lineNumber: pickNumber(report['line-number']),
    originalPolicy: pickString(report['original-policy']),
    disposition: pickString(report['disposition']),
  }
}

function normaliseReportingApi(entry: ReportingApiEntry): NormalisedViolation | null {
  if (entry.type !== 'csp-violation' || !entry.body) return null
  const body = entry.body
  return {
    blockedUri: pickString(body['blockedURL']) ?? 'unknown',
    violatedDirective: pickString(body['effectiveDirective']) ?? 'unknown',
    effectiveDirective: pickString(body['effectiveDirective']) ?? 'unknown',
    documentUri: pickString(body['documentURL']) ?? pickString(entry.url) ?? 'unknown',
    sourceFile: pickString(body['sourceFile']),
    lineNumber: pickNumber(body['lineNumber']),
    originalPolicy: pickString(body['originalPolicy']),
    disposition: pickString(body['disposition']),
  }
}

function parseIncoming(body: unknown): NormalisedViolation[] {
  if (Array.isArray(body)) {
    return body
      .map((entry) => normaliseReportingApi(entry as ReportingApiEntry))
      .filter((v): v is NormalisedViolation => v !== null)
  }
  if (body && typeof body === 'object') {
    const legacy = (body as LegacyCspReportEnvelope)['csp-report']
    if (legacy && typeof legacy === 'object') {
      return [normaliseLegacy(legacy as Record<string, unknown>)]
    }
  }
  return []
}

// Public endpoint — browsers POST violations here fire-and-forget without CORS
// preflight and often without Origin, so we don't require auth and we don't
// throttle (a misconfigured directive can produce one report per blocked asset
// per navigation; throttling would mask the storm we're trying to see).
@SkipThrottle()
@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger(CspReportController.name)

  @Post()
  @HttpCode(204)
  receive(@Body() body: unknown): void {
    const violations = parseIncoming(body)
    for (const violation of violations) {
      this.logger.warn({
        msg: 'csp.violation',
        ...violation,
      })
      Sentry.captureMessage(
        `CSP ${violation.disposition ?? 'enforce'}: ${violation.effectiveDirective}`,
        {
          level: 'warning',
          tags: {
            'csp.directive': violation.effectiveDirective,
            'csp.disposition': violation.disposition ?? 'enforce',
          },
          extra: {
            blockedUri: violation.blockedUri,
            documentUri: violation.documentUri,
            sourceFile: violation.sourceFile,
            lineNumber: violation.lineNumber,
            originalPolicy: violation.originalPolicy,
          },
        },
      )
    }
  }
}

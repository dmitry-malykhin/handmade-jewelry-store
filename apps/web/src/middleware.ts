import { type NextRequest, type NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyReportOnly,
  buildReportToHeader,
} from './lib/security-headers'

const intlMiddleware = createIntlMiddleware(routing)

function generateCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Buffer.from(bytes).toString('base64')
}

export default function middleware(request: NextRequest): NextResponse {
  const nonce = generateCspNonce()

  // Propagate nonce on request headers so Server Components read it via
  // `headers()` and stamp `nonce={nonce}` on inline <script> tags they emit.
  request.headers.set('x-nonce', nonce)

  const response = intlMiddleware(request) as NextResponse

  // Nonce CSP only in production — dev HMR uses eval + inline scripts.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
    // Report-Only mirror ships violations for a tighter style-src (nonce,
    // no 'unsafe-inline') without blocking. Flip it into the enforce policy
    // once reports are clean for ~1 week in Sentry.
    response.headers.set(
      'Content-Security-Policy-Report-Only',
      buildContentSecurityPolicyReportOnly(nonce),
    )
    response.headers.set('Report-To', buildReportToHeader())
  }
  response.headers.set('x-nonce', nonce)
  return response
}

export const config = {
  // Match all paths except: API routes, Next.js internals, /feed/* (non-localised
  // Google Merchant + Pinterest feeds), and static files with extensions
  matcher: ['/((?!api|_next|_vercel|feed|.*\\..*).*)'],
}

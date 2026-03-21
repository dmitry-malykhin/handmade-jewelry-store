import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Locale middleware:
 * - Detects preferred locale from Accept-Language header
 * - Redirects / → /en (default locale)
 * - Sets x-next-intl-locale response header (read by root layout for <html lang>)
 */
export default createMiddleware(routing)

export const config = {
  // Match all paths except: API routes, Next.js internals, static files with extensions
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

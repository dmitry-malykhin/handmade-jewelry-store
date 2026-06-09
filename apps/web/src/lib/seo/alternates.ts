import { routing } from '@/i18n/routing'

/**
 * Builds the `alternates` block for Next.js `Metadata`. Used by every
 * locale-aware page so SEO tags stay consistent (canonical + hreflang).
 *
 * Includes `x-default` per Google's international SEO recommendation
 * (https://developers.google.com/search/docs/specialty/international/localized-versions):
 * visitors whose Accept-Language does not match en/ru/es are routed to the
 * default locale (en). Without `x-default`, Google still picks one of the
 * explicit alternates, but mis-routes more often.
 *
 * @param locale - The locale of the currently rendered page. Pass `undefined`
 *                 for the root layout metadata (which has no own canonical —
 *                 each page renders its own).
 * @param path   - The route path WITHOUT the locale prefix. Use an empty string
 *                 for the locale root. Examples:
 *                   ""                          → /en, /ru, /es
 *                   "/contact"                  → /en/contact, /ru/contact, …
 *                   "/products/silver-ring"     → /en/products/silver-ring, …
 *
 * The returned shape is structurally compatible with `Metadata['alternates']`.
 */
export function buildLocaleAlternates(
  locale: string | undefined,
  path: string,
): { canonical?: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {}
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}${path}`
  }
  languages['x-default'] = `/${routing.defaultLocale}${path}`

  if (locale === undefined) {
    return { languages }
  }
  return {
    canonical: `/${locale}${path}`,
    languages,
  }
}

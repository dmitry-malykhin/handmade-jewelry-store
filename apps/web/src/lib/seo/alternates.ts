import { routing } from '@/i18n/routing'

// `path` is the route without locale prefix (e.g. "/contact", "" for root).
// Pass `locale: undefined` from the root layout — it has no own canonical
// because each page renders its own. Includes `x-default` so visitors whose
// Accept-Language doesn't match en/ru/es land on the default locale.
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

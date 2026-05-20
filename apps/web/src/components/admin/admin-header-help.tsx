'use client'

import { useLocale } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { getHelpSlugForPath } from '@/lib/admin-help/path-to-help-slug'
import { HelpButton } from './help-button'

/**
 * Floating help button mounted once in the admin layout. Reads the current
 * pathname to figure out which help doc to load — keeps individual admin
 * pages free of help wiring.
 *
 * Renders nothing on paths without a configured doc slug (e.g. an admin
 * surface added before the docs registry is updated).
 */
export function AdminHeaderHelp() {
  const pathname = usePathname()
  const locale = useLocale()
  const slug = getHelpSlugForPath(pathname)
  if (!slug) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50">
      <div className="pointer-events-auto">
        <HelpButton slug={slug} locale={locale} />
      </div>
    </div>
  )
}

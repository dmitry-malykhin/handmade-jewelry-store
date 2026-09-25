'use client'

import { useTranslations } from 'next-intl'
import { getCookiesByCategory, type CookieCategory } from '@/lib/legal/cookie-registry'

interface CookieDisclosureTableProps {
  category: CookieCategory
}

// Per-cookie disclosure table (EDPB Guidelines 03/2022, CNIL cookie doctrine).
// Rendered inside the customise-view of the cookie banner and on /cookies.
// Horizontal scroll wraps the table so long provider/name strings don't blow
// out narrow banners.
export function CookieDisclosureTable({ category }: CookieDisclosureTableProps) {
  const t = useTranslations('cookiePolicy')
  const entries = getCookiesByCategory(category)

  if (entries.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[38rem] text-left text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('columnName')}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('columnProvider')}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('columnPurpose')}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('columnDuration')}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('columnTransfer')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((cookie) => (
            <tr key={cookie.name} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-foreground">{cookie.name}</td>
              <td className="px-3 py-2 text-foreground">{cookie.provider}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {t(`purposes.${cookie.purposeKey}`)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{cookie.duration}</td>
              <td className="px-3 py-2 text-muted-foreground">{cookie.dataTransferCountry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

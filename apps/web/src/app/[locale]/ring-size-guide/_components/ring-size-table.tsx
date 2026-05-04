import { getTranslations } from 'next-intl/server'
import { RING_SIZES } from '@/lib/ring-sizes'

/**
 * Static conversion table — Server Component, no interactivity.
 * Rendered inside the ring size guide page (#118).
 *
 * Print-friendly: no decorations, plain `<table>` with semantic headers
 * so a customer can print the page directly from the browser.
 */
export async function RingSizeTable() {
  const t = await getTranslations('ringSizeGuide')

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('tableCaption')}</caption>
        <thead className="bg-accent/30 text-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              {t('columnUs')}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              {t('columnUk')}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              {t('columnEu')}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              {t('columnDiameter')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {RING_SIZES.map((size) => (
            <tr key={size.us} className="text-foreground transition-colors hover:bg-accent/10">
              <td className="px-4 py-2.5 font-medium">{size.us}</td>
              <td className="px-4 py-2.5">{size.uk}</td>
              <td className="px-4 py-2.5">{size.eu}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{size.diameterMm.toFixed(2)} mm</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

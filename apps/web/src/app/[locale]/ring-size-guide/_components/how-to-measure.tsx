import { getTranslations } from 'next-intl/server'

/**
 * Three step-by-step methods for measuring ring size at home.
 * Server Component — pure content, no state.
 *
 * Used by the ring size guide page (#118). The list is also referenced
 * by the JSON-LD HowTo schema in the page metadata so search engines
 * can show rich results for "how to measure ring size" queries.
 */
export async function HowToMeasure() {
  const t = await getTranslations('ringSizeGuide')

  return (
    <ol className="space-y-6 text-sm leading-relaxed text-foreground">
      <li>
        <h3 className="mb-2 text-base font-semibold">{t('methodExistingRingTitle')}</h3>
        <p className="text-muted-foreground">{t('methodExistingRingBody')}</p>
      </li>
      <li>
        <h3 className="mb-2 text-base font-semibold">{t('methodPaperStripTitle')}</h3>
        <p className="text-muted-foreground">{t('methodPaperStripBody')}</p>
      </li>
      <li>
        <h3 className="mb-2 text-base font-semibold">{t('methodJewelerTitle')}</h3>
        <p className="text-muted-foreground">{t('methodJewelerBody')}</p>
      </li>
    </ol>
  )
}

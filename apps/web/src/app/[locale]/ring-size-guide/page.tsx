import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { generateHowToJsonLd } from '@/lib/seo/json-ld'
import { RingSizeTable } from './_components/ring-size-table'
import { HowToMeasure } from './_components/how-to-measure'

interface RingSizeGuidePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: RingSizeGuidePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ringSizeGuide' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/ring-size-guide`,
      languages: {
        en: '/en/ring-size-guide',
        ru: '/ru/ring-size-guide',
        es: '/es/ring-size-guide',
      },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: `/${locale}/ring-size-guide`,
    },
  }
}

export default async function RingSizeGuidePage({ params }: RingSizeGuidePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('ringSizeGuide')

  // HowTo schema — feeds Google rich results for "how to measure ring size".
  // Steps mirror the visible <ol> in HowToMeasure component for consistency.
  const howToJsonLd = generateHowToJsonLd({
    name: t('howToSchemaName'),
    description: t('howToSchemaDescription'),
    url: `/${locale}/ring-size-guide`,
    steps: [
      { name: t('methodExistingRingTitle'), text: t('methodExistingRingBody') },
      { name: t('methodPaperStripTitle'), text: t('methodPaperStripBody') },
      { name: t('methodJewelerTitle'), text: t('methodJewelerBody') },
    ],
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* JSON-LD HowTo for SEO rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      {/* Hero */}
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* How to measure */}
      <section aria-labelledby="how-to-measure-heading" className="mb-16">
        <h2
          id="how-to-measure-heading"
          className="mb-6 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('howToMeasureTitle')}
        </h2>
        <HowToMeasure />
      </section>

      {/* Conversion table */}
      <section aria-labelledby="conversion-table-heading" className="mb-16">
        <h2
          id="conversion-table-heading"
          className="mb-2 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('conversionTableTitle')}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{t('conversionTableSubtitle')}</p>
        <RingSizeTable />
      </section>

      {/* Tips */}
      <section aria-labelledby="tips-heading" className="mb-12 rounded-lg bg-accent/20 p-6">
        <h2 id="tips-heading" className="mb-3 text-base font-semibold text-foreground">
          {t('tipsTitle')}
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{t('tipMeasureWarm')}</li>
          <li>{t('tipMeasureMultiple')}</li>
          <li>{t('tipKnuckleSize')}</li>
          <li>{t('tipBetweenSizes')}</li>
        </ul>
      </section>

      {/* Print hint */}
      <p className="text-center text-xs text-muted-foreground">{t('printHint')}</p>
    </main>
  )
}

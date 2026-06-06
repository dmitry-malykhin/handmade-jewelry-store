import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface CarePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CarePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'carePage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/care`,
      languages: { en: '/en/care', ru: '/ru/care', es: '/es/care' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: `/${locale}/care`,
    },
  }
}

const MATERIAL_SECTIONS = ['silver', 'goldPlated', 'gemstones'] as const
const AVOID_ITEMS = ['chlorine', 'perfume', 'cleaners', 'moisture'] as const
const STORAGE_TIPS = ['separateBags', 'antiTarnish', 'drySpot'] as const

export default async function CarePage({ params }: CarePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('carePage')

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section aria-labelledby="materials-heading" className="mb-12">
        <h2
          id="materials-heading"
          className="mb-5 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('materialsTitle')}
        </h2>
        <div className="space-y-4">
          {MATERIAL_SECTIONS.map((material) => (
            <article key={material} className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {t(`material_${material}_title`)}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {t(`material_${material}_body`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="avoid-heading" className="mb-12">
        <h2 id="avoid-heading" className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
          {t('avoidTitle')}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('avoidIntro')}</p>
        <ul role="list" className="grid gap-3 sm:grid-cols-2">
          {AVOID_ITEMS.map((item) => (
            <li key={item} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{t(`avoid_${item}_label`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`avoid_${item}_detail`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="storage-heading" className="mb-12 rounded-lg bg-accent/20 p-6">
        <h2 id="storage-heading" className="mb-4 text-base font-semibold text-foreground">
          {t('storageTitle')}
        </h2>
        <ul role="list" className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {STORAGE_TIPS.map((tip) => (
            <li key={tip}>{t(`storage_${tip}`)}</li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-muted-foreground">{t('footnote')}</p>
    </main>
  )
}

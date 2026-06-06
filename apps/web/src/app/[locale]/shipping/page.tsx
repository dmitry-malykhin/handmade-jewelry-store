import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface ShippingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ShippingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shippingPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/shipping`,
      languages: { en: '/en/shipping', ru: '/ru/shipping', es: '/es/shipping' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: `/${locale}/shipping`,
    },
  }
}

const PROCESSING_ROWS = ['inStock', 'madeToOrder', 'custom'] as const
const CARRIERS = ['usps', 'fedex', 'ups', 'dhl'] as const

export default async function ShippingPage({ params }: ShippingPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('shippingPage')

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section aria-labelledby="processing-heading" className="mb-12">
        <h2
          id="processing-heading"
          className="mb-3 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('processingTitle')}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('processingIntro')}</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent/20 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t('processingHeaderType')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('processingHeaderTime')}
                </th>
              </tr>
            </thead>
            <tbody>
              {PROCESSING_ROWS.map((row) => (
                <tr key={row} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {t(`processing_${row}_label`)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t(`processing_${row}_time`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="carriers-heading" className="mb-12">
        <h2
          id="carriers-heading"
          className="mb-3 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('carriersTitle')}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('carriersIntro')}</p>
        <ul role="list" className="grid gap-3 sm:grid-cols-2">
          {CARRIERS.map((carrier) => (
            <li key={carrier} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">{t(`carrier_${carrier}_name`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`carrier_${carrier}_detail`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tracking-heading" className="mb-12">
        <h2
          id="tracking-heading"
          className="mb-3 text-xl font-semibold text-foreground sm:text-2xl"
        >
          {t('trackingTitle')}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {t('trackingBody')}
        </p>
      </section>

      <section aria-labelledby="lost-heading" className="mb-12">
        <h2 id="lost-heading" className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
          {t('lostTitle')}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {t('lostBody')}
        </p>
      </section>

      <section aria-labelledby="international-heading" className="rounded-lg bg-accent/20 p-6">
        <h2 id="international-heading" className="mb-2 text-base font-semibold text-foreground">
          {t('internationalTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('internationalBody')}</p>
      </section>
    </main>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { getImpressumConfig } from '@/lib/config/impressum'

interface ImpressumPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ImpressumPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'impressumPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/impressum'),
    robots: { index: true, follow: true },
  }
}

export default async function ImpressumPage({ params }: ImpressumPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('impressumPage')
  const impressum = getImpressumConfig()

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('legalBasis')}</p>
      </header>

      <dl className="space-y-6 text-sm">
        <div>
          <dt className="font-medium text-foreground">{t('legalNameLabel')}</dt>
          <dd className="mt-1 text-muted-foreground">{impressum.legalName}</dd>
        </div>

        <div>
          <dt className="font-medium text-foreground">{t('addressLabel')}</dt>
          <dd className="mt-1 whitespace-pre-line text-muted-foreground">
            {impressum.addressLine1}
            {impressum.addressLine2 ? '\n' + impressum.addressLine2 : ''}
            {'\n' + impressum.postalCode + ' ' + impressum.city}
            {'\n' + impressum.country}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-foreground">{t('contactLabel')}</dt>
          <dd className="mt-1 text-muted-foreground">
            <a
              href={`mailto:${impressum.email}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {impressum.email}
            </a>
            {impressum.phone && (
              <span>
                {' · '}
                {impressum.phone}
              </span>
            )}
          </dd>
        </div>

        {impressum.registerCourt && impressum.registerNumber && (
          <div>
            <dt className="font-medium text-foreground">{t('registerLabel')}</dt>
            <dd className="mt-1 text-muted-foreground">
              {impressum.registerCourt} · {impressum.registerNumber}
            </dd>
          </div>
        )}

        {impressum.vatId && (
          <div>
            <dt className="font-medium text-foreground">{t('vatIdLabel')}</dt>
            <dd className="mt-1 text-muted-foreground">{impressum.vatId}</dd>
          </div>
        )}

        {impressum.responsiblePerson && (
          <div>
            <dt className="font-medium text-foreground">{t('responsiblePersonLabel')}</dt>
            <dd className="mt-1 text-muted-foreground">{impressum.responsiblePerson}</dd>
          </div>
        )}
      </dl>

      <section className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold text-foreground">{t('disputeResolutionTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('disputeResolutionBody')}{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
      </section>
    </main>
  )
}

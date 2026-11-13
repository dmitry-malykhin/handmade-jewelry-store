import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { getSupportEmail } from '@/lib/config/contact'
import { PrintWithdrawalFormButton } from './_components/print-withdrawal-form-button'

interface RefundPolicyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: RefundPolicyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'refundPolicyPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/refund-policy'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/refund-policy`,
    },
  }
}

const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>

export default async function RefundPolicyPage({ params }: RefundPolicyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('refundPolicyPage')
  const supportEmail = getSupportEmail()

  const emailLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
      {chunks}
    </a>
  )

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}</p>
      </header>

      <p className="mb-10 text-base leading-relaxed text-muted-foreground">{t('intro')}</p>

      <div className="space-y-10 text-base leading-relaxed text-foreground">
        <section aria-labelledby="refund-cooling-off">
          <h2 id="refund-cooling-off" className="mb-3 text-xl font-semibold text-foreground">
            {t('coolingOffHeading')}
          </h2>
          <p className="text-muted-foreground">{t.rich('coolingOffBody', { b: bold })}</p>
        </section>

        <section aria-labelledby="refund-exceptions">
          <h2 id="refund-exceptions" className="mb-3 text-xl font-semibold text-foreground">
            {t('exceptionsHeading')}
          </h2>
          <p className="mb-3 text-muted-foreground">{t('exceptionsIntro')}</p>
          <ul className="mb-3 list-disc space-y-2 pl-6 text-muted-foreground" role="list">
            <li>{t('exceptionCustom')}</li>
            <li>{t('exceptionResized')}</li>
          </ul>
          <p className="text-muted-foreground">{t('exceptionsOutro')}</p>
        </section>

        <section aria-labelledby="refund-how-to">
          <h2 id="refund-how-to" className="mb-3 text-xl font-semibold text-foreground">
            {t('howToHeading')}
          </h2>
          <p className="text-muted-foreground">
            {t.rich('howToBody', { a: emailLink, email: supportEmail })}
          </p>
        </section>

        <section aria-labelledby="refund-costs">
          <h2 id="refund-costs" className="mb-3 text-xl font-semibold text-foreground">
            {t('costsHeading')}
          </h2>
          <p className="text-muted-foreground">{t('costsBody')}</p>
        </section>

        <section aria-labelledby="refund-timing">
          <h2 id="refund-timing" className="mb-3 text-xl font-semibold text-foreground">
            {t('timingHeading')}
          </h2>
          <p className="text-muted-foreground">{t('timingBody')}</p>
        </section>

        <section aria-labelledby="refund-statutory">
          <h2 id="refund-statutory" className="mb-3 text-xl font-semibold text-foreground">
            {t('statutoryHeading')}
          </h2>
          <p className="text-muted-foreground">{t('statutoryBody')}</p>
        </section>

        <section
          aria-labelledby="refund-withdrawal-form"
          className="rounded-lg border border-border bg-muted/20 p-6 print:border-0 print:bg-transparent print:p-0"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="refund-withdrawal-form" className="text-xl font-semibold text-foreground">
              {t('withdrawalHeading')}
            </h2>
            <PrintWithdrawalFormButton />
          </div>
          <p className="mb-6 text-muted-foreground">{t('withdrawalIntro')}</p>

          <dl className="space-y-4 text-foreground">
            <div>
              <dt className="font-medium">
                {t.rich('withdrawalFormTo', { a: emailLink, email: supportEmail })}
              </dt>
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormIntro')}</dt>
              <dd className="mt-2 h-16 border-b border-dashed border-border" aria-hidden="true" />
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormOrderedOn')}</dt>
              <dd className="mt-2 h-6 border-b border-dashed border-border" aria-hidden="true" />
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormConsumerName')}</dt>
              <dd className="mt-2 h-6 border-b border-dashed border-border" aria-hidden="true" />
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormConsumerAddress')}</dt>
              <dd className="mt-2 h-12 border-b border-dashed border-border" aria-hidden="true" />
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormSignature')}</dt>
              <dd className="mt-2 h-6 border-b border-dashed border-border" aria-hidden="true" />
            </div>
            <div>
              <dt className="font-medium">{t('withdrawalFormDate')}</dt>
              <dd className="mt-2 h-6 border-b border-dashed border-border" aria-hidden="true" />
            </div>
          </dl>

          <p className="mt-6 text-xs text-muted-foreground">{t('withdrawalFormFootnote')}</p>
        </section>
      </div>
    </article>
  )
}

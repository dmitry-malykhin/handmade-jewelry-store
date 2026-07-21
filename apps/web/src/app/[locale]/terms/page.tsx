import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import Link from 'next/link'
import { getCompanyAddress, getLegalEmail, getSupportEmail } from '@/lib/config/contact'

interface TermsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'termsPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/terms'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/terms`,
    },
  }
}

const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('termsPage')
  const supportEmail = getSupportEmail()
  const legalEmail = getLegalEmail()
  const companyAddress = getCompanyAddress()

  const supportEmailLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
      {chunks}
    </a>
  )
  const privacyPageLink = (chunks: React.ReactNode) => (
    <Link href="/privacy" className="underline hover:text-foreground">
      {chunks}
    </Link>
  )

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mb-12 text-sm text-muted-foreground">{t('lastUpdated')}</p>

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          <section>
            <p className="text-muted-foreground">{t('intro')}</p>
          </section>

          <section aria-labelledby="terms-products">
            <h2 id="terms-products" className="mb-4 text-xl font-semibold text-foreground">
              {t('s1Heading')}
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>{t('s1Item1')}</li>
              <li>{t('s1Item2')}</li>
              <li>{t('s1Item3')}</li>
              <li>{t('s1Item4')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-pricing">
            <h2 id="terms-pricing" className="mb-4 text-xl font-semibold text-foreground">
              {t('s2Heading')}
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>{t('s2Item1')}</li>
              <li>{t('s2Item2')}</li>
              <li>{t('s2Item3')}</li>
              <li>{t('s2Item4')}</li>
              <li>{t('s2Item5')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-shipping">
            <h2 id="terms-shipping" className="mb-4 text-xl font-semibold text-foreground">
              {t('s3Heading')}
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>{t('s3Item1')}</li>
              <li>{t('s3Item2')}</li>
              <li>{t('s3Item3')}</li>
              <li>{t('s3Item4')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-returns">
            <h2 id="terms-returns" className="mb-4 text-xl font-semibold text-foreground">
              {t('s4Heading')}
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s4Item1', { b: bold })}</li>
              <li>{t.rich('s4Item2', { b: bold })}</li>
              <li>{t.rich('s4Item3', { a: supportEmailLink, email: supportEmail })}</li>
              <li>{t('s4Item4')}</li>
              <li>{t('s4Item5')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-ip">
            <h2 id="terms-ip" className="mb-4 text-xl font-semibold text-foreground">
              {t('s5Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s5Body')}</p>
          </section>

          <section aria-labelledby="terms-accounts">
            <h2 id="terms-accounts" className="mb-4 text-xl font-semibold text-foreground">
              {t('s6Heading')}
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>{t('s6Item1')}</li>
              <li>{t('s6Item2')}</li>
              <li>{t('s6Item3')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-prohibited">
            <h2 id="terms-prohibited" className="mb-4 text-xl font-semibold text-foreground">
              {t('s7Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s7Intro')}</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t('s7Item1')}</li>
              <li>{t('s7Item2')}</li>
              <li>{t('s7Item3')}</li>
              <li>{t('s7Item4')}</li>
              <li>{t('s7Item5')}</li>
            </ul>
          </section>

          <section aria-labelledby="terms-disclaimer">
            <h2 id="terms-disclaimer" className="mb-4 text-xl font-semibold text-foreground">
              {t('s8Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s8Body1')}</p>
            <p className="text-muted-foreground">{t('s8Body2')}</p>
          </section>

          <section aria-labelledby="terms-liability">
            <h2 id="terms-liability" className="mb-4 text-xl font-semibold text-foreground">
              {t('s9Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s9Body1')}</p>
            <p className="text-muted-foreground">{t('s9Body2')}</p>
          </section>

          <section aria-labelledby="terms-law">
            <h2 id="terms-law" className="mb-4 text-xl font-semibold text-foreground">
              {t('s10Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s10Body1')}</p>
            <p className="text-muted-foreground">{t('s10Body2')}</p>
          </section>

          <section aria-labelledby="terms-changes">
            <h2 id="terms-changes" className="mb-4 text-xl font-semibold text-foreground">
              {t('s11Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s11Body')}</p>
          </section>

          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact" className="mb-4 text-xl font-semibold text-foreground">
              {t('s12Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s12Intro')}</p>
            <address className="not-italic text-muted-foreground">
              <p>{t('s12CompanyName')}</p>
              {companyAddress && <p>{companyAddress}</p>}
              <p>
                {t('s12EmailLabel')}{' '}
                <a href={`mailto:${legalEmail}`} className="underline hover:text-foreground">
                  {legalEmail}
                </a>
              </p>
            </address>
            <p className="mt-6 text-sm text-muted-foreground">
              {t.rich('s12PrivacyLink', { a: privacyPageLink })}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

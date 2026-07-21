import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { getCompanyAddress, getPrivacyEmail } from '@/lib/config/contact'

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/privacy'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/privacy`,
    },
  }
}

// Tag renderers for t.rich — used across every localized paragraph/list item
// with inline emphasis. Defined once to keep JSX below readable.
const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('privacyPage')
  const privacyEmail = getPrivacyEmail()
  const companyAddress = getCompanyAddress()

  const emailLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${privacyEmail}`} className="underline hover:text-foreground">
      {chunks}
    </a>
  )
  const stripePolicyLink = (chunks: React.ReactNode) => (
    <a
      href="https://stripe.com/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      {chunks}
    </a>
  )

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mb-12 text-sm text-muted-foreground">{t('lastUpdated')}</p>

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          <section aria-labelledby="privacy-intro">
            <p className="text-muted-foreground">{t('intro')}</p>
          </section>

          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect" className="mb-4 text-xl font-semibold text-foreground">
              {t('s1Heading')}
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s1Item1', { b: bold })}</li>
              <li>{t.rich('s1Item2', { b: bold })}</li>
              <li>{t.rich('s1Item3', { b: bold })}</li>
              <li>{t.rich('s1Item4', { b: bold })}</li>
              <li>{t.rich('s1Item5', { b: bold })}</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-use">
            <h2 id="privacy-use" className="mb-4 text-xl font-semibold text-foreground">
              {t('s2Heading')}
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t('s2Item1')}</li>
              <li>{t('s2Item2')}</li>
              <li>{t('s2Item3')}</li>
              <li>{t('s2Item4')}</li>
              <li>{t('s2Item5')}</li>
              <li>{t('s2Item6')}</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-sharing">
            <h2 id="privacy-sharing" className="mb-4 text-xl font-semibold text-foreground">
              {t('s3Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s3Intro')}</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s3Stripe', { b: bold, a: stripePolicyLink })}</li>
              <li>{t.rich('s3Resend', { b: bold })}</li>
              <li>{t.rich('s3Klaviyo', { b: bold })}</li>
              <li>{t.rich('s3Carriers', { b: bold })}</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-analytics">
            <h2 id="privacy-analytics" className="mb-4 text-xl font-semibold text-foreground">
              {t('s4Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s4Intro')}</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s4GA4', { b: bold })}</li>
              <li>{t.rich('s4PostHog', { b: bold })}</li>
              <li>{t.rich('s4Clarity', { b: bold })}</li>
              <li>{t.rich('s4FBPixel', { b: bold })}</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-cookies">
            <h2 id="privacy-cookies" className="mb-4 text-xl font-semibold text-foreground">
              {t('s5Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s5Intro')}</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s5Necessary', { b: bold })}</li>
              <li>{t.rich('s5Analytics', { b: bold })}</li>
              <li>{t.rich('s5Marketing', { b: bold })}</li>
            </ul>
            <p className="mt-4 text-muted-foreground">{t('s5Outro')}</p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="mb-4 text-xl font-semibold text-foreground">
              {t('s6Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s6Body')}</p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="mb-4 text-xl font-semibold text-foreground">
              {t('s7Heading')}
            </h2>
            <p className="mb-4 text-muted-foreground">{t('s7Intro')}</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>{t.rich('s7Access', { b: bold })}</li>
              <li>{t.rich('s7Correction', { b: bold })}</li>
              <li>{t.rich('s7Deletion', { b: bold })}</li>
              <li>{t.rich('s7Portability', { b: bold })}</li>
              <li>{t.rich('s7OptOut', { b: bold })}</li>
              <li>{t.rich('s7Withdraw', { b: bold })}</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              {t.rich('s7Outro', { a: emailLink, email: privacyEmail })}
            </p>
          </section>

          <section aria-labelledby="privacy-security">
            <h2 id="privacy-security" className="mb-4 text-xl font-semibold text-foreground">
              {t('s8Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s8Body')}</p>
          </section>

          <section aria-labelledby="privacy-children">
            <h2 id="privacy-children" className="mb-4 text-xl font-semibold text-foreground">
              {t('s9Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s9Body')}</p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes" className="mb-4 text-xl font-semibold text-foreground">
              {t('s10Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s10Body')}</p>
          </section>

          <section aria-labelledby="privacy-contact">
            <h2 id="privacy-contact" className="mb-4 text-xl font-semibold text-foreground">
              {t('s11Heading')}
            </h2>
            <p className="text-muted-foreground">{t('s11Intro')}</p>
            <address className="mt-4 not-italic text-muted-foreground">
              <p>{t('s11CompanyName')}</p>
              {companyAddress && <p>{companyAddress}</p>}
              <p>
                {t('s11EmailLabel')}{' '}
                <a href={`mailto:${privacyEmail}`} className="underline hover:text-foreground">
                  {privacyEmail}
                </a>
              </p>
            </address>
          </section>
        </div>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/seo/alternates'
import { CookieDisclosureTable } from '@/components/shared/cookie-disclosure-table'

interface CookiePolicyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CookiePolicyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cookiePolicy' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildLocaleAlternates(locale, '/cookies'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: `/${locale}/cookies`,
    },
  }
}

export default async function CookiePolicyPage({ params }: CookiePolicyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'cookiePolicy' })

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-light text-foreground">{t('pageTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('pageIntro')}</p>
      </header>

      <section aria-labelledby="cookies-necessary" className="mt-10">
        <h2 id="cookies-necessary" className="mb-2 text-xl font-semibold text-foreground">
          {t('necessaryHeading')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('necessaryDescription')}</p>
        <CookieDisclosureTable category="necessary" />
      </section>

      <section aria-labelledby="cookies-analytics" className="mt-10">
        <h2 id="cookies-analytics" className="mb-2 text-xl font-semibold text-foreground">
          {t('analyticsHeading')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('analyticsDescription')}</p>
        <CookieDisclosureTable category="analytics" />
      </section>

      <section aria-labelledby="cookies-marketing" className="mt-10">
        <h2 id="cookies-marketing" className="mb-2 text-xl font-semibold text-foreground">
          {t('marketingHeading')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('marketingDescription')}</p>
        <CookieDisclosureTable category="marketing" />
      </section>

      <section aria-labelledby="cookies-revoke" className="mt-10">
        <h2 id="cookies-revoke" className="mb-2 text-xl font-semibold text-foreground">
          {t('revokeHeading')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('revokeDescription')}</p>
      </section>
    </article>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LoyaltyOverview } from './_components/loyalty-overview'

interface LoyaltyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: LoyaltyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.loyalty' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function LoyaltyPage({ params }: LoyaltyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.loyalty' })

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-light">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <LoyaltyOverview />
    </section>
  )
}

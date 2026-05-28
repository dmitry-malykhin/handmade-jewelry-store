import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AnalyticsView } from '../_components/analytics/analytics-view'

interface AdminAnalyticsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AdminAnalyticsPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })

  return {
    title: t('analyticsTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminAnalyticsPage({ params }: AdminAnalyticsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section aria-labelledby="admin-analytics-heading">
      <AnalyticsView />
    </section>
  )
}

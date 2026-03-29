import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { StatsCards } from './_components/stats-cards'

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AdminDashboardPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })

  return {
    title: t('dashboardTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })

  return (
    <section aria-labelledby="admin-dashboard-heading">
      <h1 id="admin-dashboard-heading" className="mb-6 text-2xl font-semibold text-foreground">
        {t('dashboardTitle')}
      </h1>
      <StatsCards />
    </section>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { OrderHistoryList } from './_components/order-history-list'

interface OrdersPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.orders' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.orders' })

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-light">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <OrderHistoryList />
    </section>
  )
}

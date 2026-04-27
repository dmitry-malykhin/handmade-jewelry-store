import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AddressesManager } from './_components/addresses-manager'

interface AddressesPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AddressesPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.addresses' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function AddressesPage({ params }: AddressesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.addresses' })

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-light">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <AddressesManager />
    </section>
  )
}

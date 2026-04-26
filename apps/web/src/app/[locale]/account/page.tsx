import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AccountOverview } from './_components/account-overview'

interface AccountPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return {
    title: t('overview.metaTitle'),
    description: t('overview.metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AccountOverview />
}

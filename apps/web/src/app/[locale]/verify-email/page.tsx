import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { VerifyEmailClient } from './_components/verify-email-client'

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: VerifyEmailPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('verifyPageTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
      <VerifyEmailClient />
    </main>
  )
}

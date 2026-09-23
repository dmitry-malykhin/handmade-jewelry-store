import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NewsletterUnsubscribeClient } from './_components/newsletter-unsubscribe-client'

interface NewsletterUnsubscribePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: NewsletterUnsubscribePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'newsletter.unsubscribePage' })
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function NewsletterUnsubscribePage({
  params,
}: NewsletterUnsubscribePageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
      <NewsletterUnsubscribeClient />
    </main>
  )
}

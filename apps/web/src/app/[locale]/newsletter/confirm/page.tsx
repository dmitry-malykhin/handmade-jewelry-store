import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NewsletterConfirmClient } from './_components/newsletter-confirm-client'

interface NewsletterConfirmPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: NewsletterConfirmPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'newsletter.confirmPage' })
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function NewsletterConfirmPage({ params }: NewsletterConfirmPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
      <NewsletterConfirmClient />
    </main>
  )
}

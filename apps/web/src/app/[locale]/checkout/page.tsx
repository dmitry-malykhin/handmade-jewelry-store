import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CheckoutAddressForm } from './_components/checkout-address-form'

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkoutPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false },
  }
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="container mx-auto px-4 py-8">
      <CheckoutAddressForm />
    </main>
  )
}

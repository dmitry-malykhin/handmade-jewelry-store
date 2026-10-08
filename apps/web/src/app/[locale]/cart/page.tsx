import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CartPageContent } from './_components/cart-page-content'

interface CartPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cartPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false },
  }
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="container mx-auto px-4 py-8">
      <CartPageContent />
    </div>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { WishlistManager } from './_components/wishlist-manager'

interface WishlistPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: WishlistPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.wishlist' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function WishlistPage({ params }: WishlistPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.wishlist' })

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-light">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <WishlistManager />
    </section>
  )
}

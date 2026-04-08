import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { HeroSection } from './_components/hero-section'
import { StatusCard } from './_components/status-card'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    // Title falls through to layout default template: "Handmade Jewelry Store"
    // Home page uses just the brand name, no suffix needed
    title: { absolute: t('title') },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', ru: '/ru', es: '/es' },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      url: `/${locale}`,
    },
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
      <HeroSection />
      <StatusCard />
    </div>
  )
}

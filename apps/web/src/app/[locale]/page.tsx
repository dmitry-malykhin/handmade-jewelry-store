import { setRequestLocale } from 'next-intl/server'
import { HeroSection } from './_components/hero-section'
import { StatusCard } from './_components/status-card'

interface HomePageProps {
  params: Promise<{ locale: string }>
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

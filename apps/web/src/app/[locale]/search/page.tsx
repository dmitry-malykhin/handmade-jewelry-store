import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SearchResults } from './_components/search-results'

interface SearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'searchPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // Search pages are user-specific and offer no canonical value to crawlers
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { q } = await searchParams

  return (
    <main className="container mx-auto px-4 py-8">
      <SearchResults initialQuery={q ?? ''} />
    </main>
  )
}

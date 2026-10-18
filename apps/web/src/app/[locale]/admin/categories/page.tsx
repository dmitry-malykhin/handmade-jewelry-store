import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CategoriesTable } from './_components/categories-table'

interface AdminCategoriesPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AdminCategoriesPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })

  return {
    title: t('categoriesTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminCategoriesPage({ params }: AdminCategoriesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section aria-labelledby="categories-heading">
      <CategoriesTable />
    </section>
  )
}

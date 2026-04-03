import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchCategories, fetchProductBySlug } from '@/lib/api/products'
import { EditProductForm } from './_components/edit-product-form'

interface AdminEditProductPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: AdminEditProductPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'admin' })

  return {
    title: t('productsEditTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AdminEditProductPage({ params }: AdminEditProductPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  try {
    const [categories, product] = await Promise.all([fetchCategories(), fetchProductBySlug(slug)])

    return (
      <main className="mx-auto max-w-3xl">
        <EditProductForm categories={categories} product={product} />
      </main>
    )
  } catch {
    notFound()
  }
}

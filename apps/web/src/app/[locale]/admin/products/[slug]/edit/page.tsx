import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchCategories, fetchProductBySlug } from '@/lib/api/products'
import { ProductForm } from '../../_components/product-form'

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

  // .catch(() => null) + sync notFound() — same rationale as products/[slug]/page.tsx
  const [categories, product] = await Promise.all([
    fetchCategories().catch(() => null),
    fetchProductBySlug(slug).catch(() => null),
  ])
  if (!categories || !product) notFound()

  return (
    <main className="mx-auto max-w-3xl">
      <ProductForm mode="edit" categories={categories} product={product} />
    </main>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchProducts } from '@/lib/api/products'
import { generateBreadcrumbJsonLd } from '@/lib/seo/json-ld'
import { ProductGrid } from '@/components/features/catalog/product-grid'
import { CatalogHeader } from './_components/catalog-header'

// ISR — revalidate catalog every hour so new products appear without full redeploy
export const revalidate = 3600

interface CatalogPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'catalog' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
    alternates: {
      canonical: `/${locale}/shop`,
      languages: { en: '/en/shop', ru: '/ru/shop', es: '/es/shop' },
    },
  }
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('catalog')
  const { data: products, meta } = await fetchProducts({ limit: 20 })

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), href: `/${locale}` },
    { name: t('breadcrumbShop'), href: `/${locale}/shop` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4 py-8">
        <CatalogHeader
          totalCount={meta.totalCount}
          breadcrumbHome={t('breadcrumbHome')}
          breadcrumbShop={t('breadcrumbShop')}
          breadcrumbLabel={t('breadcrumbLabel')}
          title={t('title')}
          productsCount={t('productsCount', { count: meta.totalCount })}
        />

        <main>
          <ProductGrid products={products} />
        </main>
      </div>
    </>
  )
}

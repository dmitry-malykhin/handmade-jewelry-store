import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { fetchProducts } from '@/lib/api/products'
import { CartPageContent } from './_components/cart-page-content'
import { PopularProductsRail } from './_components/popular-products-rail'

interface CartPageProps {
  params: Promise<{ locale: string }>
}

const POPULAR_PRODUCTS_LIMIT = 4

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
  const t = await getTranslations({ locale, namespace: 'cartPage' })

  // #469: top-rated products power both the empty-cart recovery carousel and
  // the "you might also like" rail under the items list. Fetched once here
  // so both branches render without a second client round-trip.
  let popularProducts: Product[] = []
  try {
    const response = await fetchProducts({
      limit: POPULAR_PRODUCTS_LIMIT,
      sortBy: 'avgRating',
      sortOrder: 'desc',
    })
    popularProducts = response.data
  } catch {
    // API unavailable — render the cart without the rail rather than a 500.
  }

  return (
    <section aria-label={t('title')} className="container mx-auto px-4 py-8">
      <CartPageContent
        emptyCartRail={
          <PopularProductsRail
            products={popularProducts}
            headingKey="emptyCartPopularHeading"
            className="mt-8 border-t pt-8"
          />
        }
        upsellRail={
          <PopularProductsRail products={popularProducts} headingKey="upsellRailHeading" />
        }
      />
    </section>
  )
}

import { getTranslations } from 'next-intl/server'
import type { Product } from '@jewelry/shared'
import { Link } from '@/i18n/navigation'
import { ProductImageGallery } from './product-image-gallery'
import { ProductInfo } from './product-info'

interface ProductDetailProps {
  product: Product
}

export async function ProductDetail({ product }: ProductDetailProps) {
  const t = await getTranslations('productDetail')

  return (
    <article aria-label={product.title}>
      {/* Breadcrumbs */}
      <nav aria-label={t('breadcrumbLabel')} className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t('breadcrumbHome')}
            </Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden="true" className="select-none">
                /
              </li>
              <li>
                <Link
                  href={`/?categorySlug=${product.category.slug}`}
                  className="hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true" className="select-none">
            /
          </li>
          <li aria-current="page" className="text-foreground">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* Main layout: gallery left, info right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductImageGallery images={product.images} productTitle={product.title} />
        <ProductInfo product={product} />
      </div>
    </article>
  )
}

import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

/**
 * Product-segment Not Found UI — rendered when notFound() is called from
 * apps/web/src/app/[locale]/products/[slug]/page.tsx (i.e. the slug doesn't
 * resolve to a real product).
 *
 * Co-located with the page so Next.js scopes the 404 boundary tightly — the rest
 * of the locale shell (header, footer, nav) still renders around this content.
 *
 * Returns the proper 404 HTTP status (regression: #289).
 */
export default async function ProductNotFound() {
  const t = await getTranslations('productNotFound')

  return (
    <main className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
      <p className="max-w-prose text-base text-muted-foreground">{t('description')}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">{t('browseCatalog')}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/search">{t('searchProducts')}</Link>
        </Button>
      </div>
    </main>
  )
}

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { CookiePreferencesButton } from '@/components/shared/cookie-preferences-button'

/**
 * Site footer — Server Component.
 * All text from translations. locale-aware Link for all hrefs.
 */
export function Footer() {
  const t = useTranslations('footer')

  const linkGroups = [
    {
      groupKey: 'shopGroup',
      links: [
        { key: 'allJewelry', href: '/shop' },
        { key: 'rings', href: '/shop/rings' },
        { key: 'necklaces', href: '/shop/necklaces' },
        { key: 'earrings', href: '/shop/earrings' },
      ],
    },
    {
      groupKey: 'companyGroup',
      links: [
        { key: 'aboutUs', href: '/about' },
        { key: 'ourStory', href: '/about#story' },
        { key: 'contact', href: '/contact' },
      ],
    },
    {
      groupKey: 'supportGroup',
      links: [
        { key: 'faq', href: '/faq' },
        { key: 'shipping', href: '/shipping' },
        { key: 'careGuide', href: '/care' },
        { key: 'sizeGuide', href: '/size-guide' },
      ],
    },
  ] as const

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="text-lg font-semibold">✦ Jewelry</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          {linkGroups.map(({ groupKey, links }) => (
            <nav key={groupKey} aria-label={t(groupKey)}>
              <p className="mb-3 text-sm font-medium text-foreground">{t(groupKey)}</p>
              <ul role="list" className="space-y-2">
                {links.map(({ key, href }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t('copyright')}
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              {t('terms')}
            </Link>
            <CookiePreferencesButton />
          </div>
        </div>
      </div>
    </footer>
  )
}

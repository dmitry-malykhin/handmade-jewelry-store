import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { CookiePreferencesButton } from '@/components/shared/cookie-preferences-button'
import { NewsletterForm } from '@/components/features/newsletter/newsletter-form'

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
        <section
          aria-labelledby="footer-newsletter-heading"
          className="mb-10 flex flex-col gap-3 border-b border-border pb-10 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-md">
            <h2 id="footer-newsletter-heading" className="text-base font-medium text-foreground">
              {t('newsletterHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('newsletterDescription')}</p>
          </div>
          <div className="md:w-[28rem]">
            <NewsletterForm variant="footer" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo-light.svg"
              alt="Senichka — Handmade Beaded Jewelry"
              width={140}
              height={33}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/logo-dark.svg"
              alt="Senichka — Handmade Beaded Jewelry"
              width={140}
              height={33}
              className="hidden h-8 w-auto dark:block"
            />
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

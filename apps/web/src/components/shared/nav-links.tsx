import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/**
 * Desktop navigation links.
 * Server Component — useTranslations works on server with next-intl.
 * Link from @/i18n/navigation auto-prepends the active locale.
 */
export function NavLinks() {
  const t = useTranslations('navigation')

  const links = [
    { key: 'shop', href: '/shop' },
    { key: 'collections', href: '/collections' },
    { key: 'about', href: '/about' },
    { key: 'contact', href: '/contact' },
  ] as const

  return (
    <nav aria-label="Main navigation">
      <ul role="list" className="hidden items-center gap-6 md:flex">
        {links.map(({ key, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function NavLinks() {
  const t = useTranslations('navigation')

  const links = [
    { key: 'shop', href: '/' },
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
              className="rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

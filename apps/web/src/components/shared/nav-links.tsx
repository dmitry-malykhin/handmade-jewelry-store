import Link from 'next/link'

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Shop', href: '/shop' },
  { label: 'Collections', href: '/collections' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

/**
 * Desktop navigation links.
 * Server Component — no interactivity, renders static links.
 * Active state will be added via usePathname in a future iteration.
 */
export function NavLinks() {
  return (
    <nav aria-label="Main navigation">
      <ul role="list" className="hidden items-center gap-6 md:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

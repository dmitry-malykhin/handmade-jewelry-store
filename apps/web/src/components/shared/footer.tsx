import Link from 'next/link'

const FOOTER_LINKS = {
  Shop: [
    { label: 'All Jewelry', href: '/shop' },
    { label: 'Rings', href: '/shop/rings' },
    { label: 'Necklaces', href: '/shop/necklaces' },
    { label: 'Earrings', href: '/shop/earrings' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Our Story', href: '/about#story' },
    { label: 'Contact', href: '/contact' },
  ],
  Support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Shipping & Returns', href: '/shipping' },
    { label: 'Care Guide', href: '/care' },
    { label: 'Size Guide', href: '/size-guide' },
  ],
} as const

/**
 * Site footer — Server Component.
 * No interactivity, fully static. Rendered once on the server.
 */
export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-lg font-semibold">✦ Jewelry</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Unique handmade jewelry crafted with love using ethically sourced materials.
            </p>
          </div>

          {/* Link columns */}
          {(
            Object.entries(FOOTER_LINKS) as [string, readonly { label: string; href: string }[]][]
          ).map(([group, links]) => (
            <nav key={group} aria-label={`${group} links`}>
              <p className="mb-3 text-sm font-medium text-foreground">{group}</p>
              <ul role="list" className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Handmade Jewelry Store. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

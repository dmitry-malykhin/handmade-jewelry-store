import Link from 'next/link'
import { Search, ShoppingCart } from 'lucide-react'
import { NavLinks } from './nav-links'
import { MobileNav } from './mobile-nav'
import { Button } from '@/components/ui/button'

/**
 * Site header — Server Component.
 * Only MobileNav is a Client Component (it needs useState for toggle).
 * CartButton will connect to Zustand store in Issue #14.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          aria-label="Handmade Jewelry Store — home"
        >
          ✦ Jewelry
        </Link>

        {/* Desktop navigation */}
        <NavLinks />

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" asChild>
            <Link href="/search">
              <Search className="size-5" />
            </Link>
          </Button>

          {/* Cart — counter will be wired to Zustand in Issue #14 */}
          <Button variant="ghost" size="icon" aria-label="Shopping cart" asChild>
            <Link href="/cart">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>

          {/* Mobile menu toggle — only Client Component in this tree */}
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

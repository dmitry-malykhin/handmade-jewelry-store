import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { NavLinks } from './nav-links'
import { MobileNav } from './mobile-nav'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { CartIconButton } from './cart-icon-button'
import { AccountIconButton } from './account-icon-button'

/**
 * Site header — Server Component.
 * Translations via useTranslations (server-side).
 * locale-aware Link auto-prepends /en, /ru, /es.
 */
export function Header() {
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          aria-label={t('logoLabel')}
        >
          ✦ Jewelry
        </Link>

        <NavLinks />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t('search')} asChild>
            <Link href="/search">
              <Search className="size-5" />
            </Link>
          </Button>

          <AccountIconButton />

          <CartIconButton />

          {/* Theme toggle — visible on both desktop and mobile */}
          <ThemeToggle />

          {/* Desktop language switcher — hidden on mobile (MobileNav handles it) */}
          <div className="hidden md:flex">
            <LanguageSwitcher />
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  )
}

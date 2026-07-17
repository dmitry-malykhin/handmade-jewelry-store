import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { NavLinks } from './nav-links'
import { MobileNav } from './mobile-nav'
import { CurrencySwitcher } from './currency-switcher'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'
import { CartIconButton } from './cart-icon-button'
import { AccountIconButton } from './account-icon-button'

export function Header() {
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="transition-opacity hover:opacity-80" aria-label={t('logoLabel')}>
          <Image
            src="/logo-light.svg"
            alt="Senichka — Handmade Beaded Jewelry"
            width={68}
            height={37}
            className="h-9 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="Senichka — Handmade Beaded Jewelry"
            width={68}
            height={37}
            className="hidden h-9 w-auto dark:block"
            priority
          />
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

          <ThemeToggle />

          <div className="hidden items-center md:flex">
            <CurrencySwitcher />
            <LanguageSwitcher />
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  )
}

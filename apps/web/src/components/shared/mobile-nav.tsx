'use client'

import { useState, useEffect, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { Menu, X, ChevronDown, Check, Sun, Moon } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LOCALES } from './language-switcher'

const NAV_LINKS = [
  { key: 'navigation.shop', href: '/shop' },
  { key: 'navigation.collections', href: '/collections' },
  { key: 'navigation.about', href: '/about' },
  { key: 'navigation.contact', href: '/contact' },
] as const

/**
 * Mobile navigation:
 * - Hamburger button in the header (top-right)
 * - Animated slide-in sidebar from the right, full height minus header
 * - Semi-transparent backdrop closes the menu on tap
 * - Language selector as an accordion at the bottom (expandable dropdown)
 *   because more languages may be added in the future
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const { resolvedTheme, setTheme } = useTheme()

  const current = LOCALES[locale] ?? (LOCALES['en'] as NonNullable<(typeof LOCALES)[string]>)

  // Close sidebar when route changes (user navigated)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Lock body scroll while sidebar is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  function close() {
    setIsOpen(false)
    setLangOpen(false)
  }

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
    close()
  }

  return (
    <div className="md:hidden">
      {/* ── Hamburger toggle ──────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? t('header.closeMenu') : t('header.openMenu')}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Menu
          className={cn(
            'absolute size-5 transition-all duration-200',
            isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
          )}
          aria-hidden="true"
        />
        <X
          className={cn(
            'absolute size-5 transition-all duration-200',
            isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
          )}
          aria-hidden="true"
        />
      </Button>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          'fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm',
          'transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* ── Sliding sidebar ───────────────────────────────────────────────── */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t('header.openMenu')}
        className={cn(
          // Sizing: full height minus header (h-16 = 4rem), max 320px wide
          'fixed right-0 top-16 z-50 flex h-[calc(100dvh-4rem)] w-[min(320px,85vw)] flex-col',
          'border-l bg-background shadow-2xl',
          // Slide animation
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Nav links — scrollable if many items */}
        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-6">
          <ul role="list" className="flex flex-col gap-1">
            {NAV_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="flex items-center rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={close}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Bottom controls (theme + language) ────────────────────────── */}
        <div className="shrink-0 border-t px-3 py-4">
          {/* Theme toggle row */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="relative size-4 shrink-0" aria-hidden="true">
              <Sun className="absolute size-4 transition-all duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 transition-all duration-300 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
            </span>
            <span className="dark:hidden">{t('header.switchToDark')}</span>
            <span className="hidden dark:inline">{t('header.switchToLight')}</span>
          </button>
          {/* Accordion trigger */}
          <button
            type="button"
            onClick={() => setLangOpen((prev) => !prev)}
            aria-expanded={langOpen}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-base leading-none">
                {current.flag}
              </span>
              <span>{current.name}</span>
            </span>
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', langOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          {/* Accordion panel — smooth height animation */}
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              langOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <ul role="list" className="mt-1 flex flex-col gap-0.5 pl-2">
              {Object.entries(LOCALES).map(([code, config]) => {
                const isActive = locale === code
                return (
                  <li key={code}>
                    <button
                      type="button"
                      onClick={() => switchLocale(code)}
                      disabled={isPending || isActive}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        isPending && 'opacity-50',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="text-base leading-none">
                          {config.flag}
                        </span>
                        <span>{config.name}</span>
                      </span>
                      {isActive && <Check className="size-3.5 text-primary" aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

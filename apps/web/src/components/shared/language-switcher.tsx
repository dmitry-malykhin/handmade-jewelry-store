'use client'

import { useLocale } from 'next-intl'
import { useTransition } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface LocaleConfig {
  flag: string
  name: string // always in the language itself: "Русский", not "Russian"
  short: string
}

export const LOCALES: Record<string, LocaleConfig> = {
  en: { flag: '🇺🇸', name: 'English', short: 'EN' },
  ru: { flag: '🇷🇺', name: 'Русский', short: 'RU' },
  es: { flag: '🇪🇸', name: 'Español', short: 'ES' },
}

/**
 * Desktop language switcher.
 * Trigger shows the CURRENT locale's flag + 2-letter code — visible at a glance.
 * Dropdown shows flag + native language name + checkmark for active.
 * Position: header right side between cart and hamburger.
 */
export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const current = LOCALES[locale] ?? (LOCALES['en'] as LocaleConfig)

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={`Language: ${current.name}. Click to change`}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium',
          'text-foreground transition-colors hover:bg-accent',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isPending && 'opacity-50',
        )}
      >
        {/* Colored flag — immediately visible, no click needed */}
        <span aria-hidden="true" className="text-base leading-none">
          {current.flag}
        </span>
        <span className="tracking-wide">{current.short}</span>
        <ChevronDown className="size-3 opacity-50" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {Object.entries(LOCALES).map(([code, config]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-base leading-none">
                {config.flag}
              </span>
              <span>{config.name}</span>
            </span>
            {locale === code && <Check className="size-3.5 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { Check, ChevronDown } from 'lucide-react'
import { SUPPORTED_DISPLAY_CURRENCIES, type DisplayCurrency } from '@jewelry/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useCurrencyStore } from '@/store/currency.store'

interface CurrencyConfig {
  symbol: string
  name: string
}

export const CURRENCY_OPTIONS: Record<DisplayCurrency, CurrencyConfig> = {
  USD: { symbol: '$', name: 'US Dollar' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
}

export function CurrencySwitcher() {
  const t = useTranslations('currencySwitcher')
  const displayCurrency = useCurrencyStore((state) => state.displayCurrency)
  const setDisplayCurrency = useCurrencyStore((state) => state.setDisplayCurrency)

  const current = CURRENCY_OPTIONS[displayCurrency]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('triggerAriaLabel', { currency: displayCurrency })}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium',
          'text-foreground transition-colors hover:bg-accent',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {current.symbol}
        </span>
        <span className="tracking-wide">{displayCurrency}</span>
        <ChevronDown className="size-3 opacity-50" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {SUPPORTED_DISPLAY_CURRENCIES.map((code) => {
          const config = CURRENCY_OPTIONS[code]
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setDisplayCurrency(code)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base leading-none">
                  {config.symbol}
                </span>
                <span>{config.name}</span>
                <span className="text-xs text-muted-foreground">({code})</span>
              </span>
              {displayCurrency === code && (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

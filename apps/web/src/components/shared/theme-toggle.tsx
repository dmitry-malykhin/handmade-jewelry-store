'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('header')

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={className}
      suppressHydrationWarning
    >
      <Sun
        className={cn(
          'absolute size-5 transition-all duration-300 ease-in-out',
          'rotate-0 scale-100 dark:-rotate-90 dark:scale-0',
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          'absolute size-5 transition-all duration-300 ease-in-out',
          'rotate-90 scale-0 dark:rotate-0 dark:scale-100',
        )}
        aria-hidden="true"
      />
    </Button>
  )
}

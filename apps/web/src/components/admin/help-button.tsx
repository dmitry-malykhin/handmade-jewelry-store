'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpDrawer } from './help-drawer'

interface HelpButtonProps {
  /** docs/admin-help/{locale}/{slug}.md to load when the drawer opens */
  slug: string
  /** Active admin locale — propagated to the drawer for content selection. */
  locale: string
}

/**
 * Floating help trigger for admin pages.
 *
 * Renders as a top-right ghost icon button (anchored via absolute positioning
 * by the consumer's layout) and listens for the global `?` keyboard shortcut.
 *
 * Shortcut design — `?` (no modifier) was chosen to match Linear / GitHub
 * convention. We ignore the key while typing in inputs / textareas / select
 * triggers so users entering literal `?` characters into forms are unaffected.
 */
export function HelpButton({ slug, locale }: HelpButtonProps) {
  const t = useTranslations('admin')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '?') return
      // Skip when focus is inside an editable element
      const target = event.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target.isContentEditable) return
      event.preventDefault()
      setIsOpen(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(true)}
        aria-label={t('helpButtonLabel')}
        title={t('helpButtonLabel')}
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </Button>
      <HelpDrawer slug={slug} locale={locale} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpDrawer } from './help-drawer'

interface HelpButtonProps {
  // Resolves to docs/admin-help/{locale}/{slug}.md
  slug: string
  locale: string
}

// `?` shortcut matches Linear/GitHub convention.
export function HelpButton({ slug, locale }: HelpButtonProps) {
  const t = useTranslations('admin')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '?') return
      // Skip when typing literal "?" into a form field.
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

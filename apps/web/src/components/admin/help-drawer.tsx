'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MarkdownRenderer } from './markdown-renderer'

interface HelpDrawerProps {
  // Maps to docs/admin-help/{locale}/{slug}.md
  slug: string
  locale: string
  isOpen: boolean
  onClose: () => void
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; content: string }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function HelpDrawer({ slug, locale, isOpen, onClose }: HelpDrawerProps) {
  const t = useTranslations('admin')
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })
  // Ref (not state) so updating it doesn't retrigger the effect; lets the drawer
  // skip the refetch when re-opened on the same page in the same locale.
  const loadedKeyRef = useRef<string | null>(null)
  const cacheKey = `${locale}::${slug}`

  useEffect(() => {
    if (!isOpen) return
    if (loadedKeyRef.current === cacheKey) return

    let cancelled = false
    setFetchState({ status: 'loading' })

    fetch(`/api/admin-help/${locale}/${slug}`)
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 404) {
          setFetchState({ status: 'not-found' })
          loadedKeyRef.current = cacheKey
          return
        }
        if (!response.ok) {
          setFetchState({ status: 'error', message: `HTTP ${response.status}` })
          loadedKeyRef.current = cacheKey
          return
        }
        const content = await response.text()
        setFetchState({ status: 'ready', content })
        loadedKeyRef.current = cacheKey
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unknown error'
        setFetchState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, slug, locale, cacheKey])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{t('helpDrawerTitle')}</SheetTitle>
          <SheetDescription className="text-xs font-mono">{slug}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4 pb-8">
          {fetchState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">{t('helpDrawerLoading')}</p>
          )}
          {fetchState.status === 'not-found' && (
            <p className="text-sm text-muted-foreground">{t('helpDrawerNotFound')}</p>
          )}
          {fetchState.status === 'error' && (
            <p className="text-sm text-destructive">
              {t('helpDrawerError', { message: fetchState.message })}
            </p>
          )}
          {fetchState.status === 'ready' && <MarkdownRenderer content={fetchState.content} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

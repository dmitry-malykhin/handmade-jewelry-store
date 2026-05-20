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
  /** Slug like 'discounts/create' that maps to docs/admin-help/{locale}/{slug}.md */
  slug: string
  /** Active admin locale — `en`, `ru`, or `es`. */
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

/**
 * Right-side drawer rendering an admin help Markdown article.
 *
 * Fetch is lazy: we wait for `isOpen` before hitting the network so the help
 * system has zero cost when admin doesn't ask for it. We also cache the last
 * fetched slug — closing & re-opening on the same page doesn't re-fetch.
 */
export function HelpDrawer({ slug, locale, isOpen, onClose }: HelpDrawerProps) {
  const t = useTranslations('admin')
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })
  // Records the last (locale, slug) pair we resolved (in any terminal status).
  // Used to skip refetch when the drawer re-opens on the same page in the same
  // locale. We track it via ref — not state — so updating it does not
  // retrigger the effect.
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

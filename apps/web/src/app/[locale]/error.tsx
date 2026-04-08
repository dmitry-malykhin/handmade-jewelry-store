'use client'

import { useTranslations } from 'next-intl'
import { ErrorMessage } from '@/components/shared/error-message'

interface LocaleErrorProps {
  reset: () => void
}

// Global error boundary for all pages under /[locale]
// Catches errors not caught by more specific error.tsx boundaries
export default function LocaleError({ reset }: LocaleErrorProps) {
  const t = useTranslations('errors')

  return (
    <div className="container mx-auto px-4 py-8">
      <ErrorMessage description={t('pageLoadError')} onRetry={reset} showHomeLink />
    </div>
  )
}

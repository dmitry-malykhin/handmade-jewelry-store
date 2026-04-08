'use client'

import { useTranslations } from 'next-intl'
import { ErrorMessage } from '@/components/shared/error-message'

interface AdminErrorProps {
  reset: () => void
}

export default function AdminError({ reset }: AdminErrorProps) {
  const t = useTranslations('errors')

  return <ErrorMessage description={t('pageLoadError')} onRetry={reset} />
}

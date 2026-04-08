'use client'

import { useTranslations } from 'next-intl'
import { ErrorMessage } from '@/components/shared/error-message'

interface CatalogErrorProps {
  reset: () => void
}

export default function CatalogError({ reset }: CatalogErrorProps) {
  const t = useTranslations('errors')

  return <ErrorMessage description={t('catalogLoadError')} onRetry={reset} showHomeLink />
}

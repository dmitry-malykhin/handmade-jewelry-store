'use client'

import { useTranslations } from 'next-intl'
import { ErrorMessage } from '@/components/shared/error-message'

interface ProductErrorProps {
  reset: () => void
}

export default function ProductError({ reset }: ProductErrorProps) {
  const t = useTranslations('errors')

  return <ErrorMessage description={t('productLoadError')} onRetry={reset} showHomeLink />
}

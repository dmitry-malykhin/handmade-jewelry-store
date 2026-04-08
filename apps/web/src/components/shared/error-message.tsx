'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

interface ErrorMessageProps {
  /** Specific error description shown below the heading */
  description?: string
  /** Called when user clicks "Try again" — pass the reset fn from error.tsx */
  onRetry?: () => void
  /** Show "Go to homepage" link instead of / in addition to retry button */
  showHomeLink?: boolean
}

export function ErrorMessage({ description, onRetry, showHomeLink = false }: ErrorMessageProps) {
  const t = useTranslations('errors')

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-lg font-semibold text-foreground">{t('somethingWentWrong')}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      <div className="flex gap-3">
        {onRetry && (
          <Button variant="default" onClick={onRetry}>
            {t('tryAgain')}
          </Button>
        )}
        {showHomeLink && (
          <Button variant="outline" asChild>
            <Link href="/">{t('goHome')}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

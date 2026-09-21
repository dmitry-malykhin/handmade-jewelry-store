'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { confirmNewsletterSubscription } from '@/lib/api/newsletter'

type ConfirmState = 'pending' | 'success' | 'already' | 'error'

export function NewsletterConfirmClient() {
  const t = useTranslations('newsletter.confirmPage')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const [state, setState] = useState<ConfirmState>('pending')

  useEffect(() => {
    if (!token || !email) {
      setState('error')
      return
    }
    confirmNewsletterSubscription(email, token)
      .then((result) => setState(result.status === 'already-confirmed' ? 'already' : 'success'))
      .catch(() => setState('error'))
  }, [token, email])

  if (state === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">{t('pending')}</p>
      </div>
    )
  }

  if (state === 'success' || state === 'already') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-foreground">
          {state === 'success' ? t('successTitle') : t('alreadyTitle')}
        </h1>
        <p className="text-muted-foreground">
          {state === 'success' ? t('successBody') : t('alreadyBody')}
        </p>
        <Button asChild className="mt-2">
          <Link href="/">{t('successCta')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center"
    >
      <XCircle className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-foreground">{t('errorTitle')}</h1>
      <p className="text-muted-foreground">{t('errorBody')}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">{t('errorCta')}</Link>
      </Button>
    </div>
  )
}

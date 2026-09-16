'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { verifyEmail } from '@/lib/api/auth'

type VerifyState = 'pending' | 'success' | 'error'

export function VerifyEmailClient() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<VerifyState>('pending')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'))
  }, [token])

  if (state === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">{t('verifyPagePending')}</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-foreground">{t('verifyPageSuccessTitle')}</h1>
        <p className="text-muted-foreground">{t('verifyPageSuccessBody')}</p>
        <Button asChild className="mt-2">
          <Link href="/login">{t('verifyPageSuccessCta')}</Link>
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
      <h1 className="text-xl font-semibold text-foreground">{t('verifyPageErrorTitle')}</h1>
      <p className="text-muted-foreground">{t('verifyPageErrorBody')}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/register">{t('verifyPageErrorCta')}</Link>
      </Button>
    </div>
  )
}

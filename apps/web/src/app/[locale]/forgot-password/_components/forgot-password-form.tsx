'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPassword } from '@/lib/api/auth'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')

  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await forgotPassword(email)
    } catch {
      // Intentionally silent — we never reveal whether an email is registered
    } finally {
      setIsSubmitting(false)
      // Always show success regardless of outcome (enumeration-safe UX)
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold text-foreground">
          {t('forgotPasswordSuccessTitle')}
        </p>
        <p className="mb-6 text-sm text-muted-foreground">{t('forgotPasswordSuccessMessage')}</p>
        <Link
          href="/login"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('forgotPasswordBackToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={t('forgotPasswordTitle')}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('forgotPasswordTitle')}</legend>

        <div className="space-y-2">
          <Label htmlFor="forgot-email">{t('forgotPasswordEmailLabel')}</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder={t('fieldEmailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-required="true"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('forgotPasswordSubmitting') : t('forgotPasswordSubmit')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('forgotPasswordBackToLogin')}
          </Link>
        </p>
      </fieldset>
    </form>
  )
}

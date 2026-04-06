'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export function ResetPasswordForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!token) {
    return (
      <div role="alert" className="text-center">
        <p className="mb-4 text-sm text-destructive">{t('resetPasswordInvalidToken')}</p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('resetPasswordBackToForgot')}
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (newPassword !== confirmPassword) {
      setValidationError(t('resetPasswordMismatch'))
      return
    }

    setIsSubmitting(true)

    try {
      // token is guaranteed non-null here — the null branch renders an error state and returns early
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await resetPassword(token!, newPassword)
      toast.success(t('resetPasswordSuccessMessage'))
      router.push('/login')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('resetPasswordInvalidToken')
      setValidationError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={t('resetPasswordTitle')}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('resetPasswordTitle')}</legend>

        <div className="space-y-2">
          <Label htmlFor="reset-new-password">{t('resetPasswordNewPasswordLabel')}</Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('resetPasswordNewPasswordPlaceholder')}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            aria-required="true"
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">{t('resetPasswordConfirmLabel')}</Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('resetPasswordConfirmPlaceholder')}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            aria-required="true"
            minLength={8}
          />
        </div>

        {validationError !== null && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('resetPasswordSubmitting') : t('resetPasswordSubmit')}
        </Button>
      </fieldset>
    </form>
  )
}

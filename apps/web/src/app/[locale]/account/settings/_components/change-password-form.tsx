'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'

export function ChangePasswordForm() {
  const t = useTranslations('account.settings.changePassword')
  const accessToken = useAuthStore((state) => state.accessToken)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validatePasswordStrength(value: string): string | null {
    if (value.length < 8) return t('errorWeak')
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return t('errorWeak')
    return null
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!accessToken) {
      setValidationError(t('errorUnauthorized'))
      return
    }

    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError !== null) {
      setValidationError(strengthError)
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError(t('errorMismatch'))
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword(accessToken, currentPassword, newPassword)
      toast.success(t('successMessage'))
      // Clear form on success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('errorGeneric')
      setValidationError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('title')}
      className="max-w-md rounded-lg border border-border bg-card p-6"
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('title')}</legend>

        <h3 className="text-lg font-medium">{t('title')}</h3>

        <div className="space-y-2">
          <Label htmlFor="current-password">{t('currentPasswordLabel')}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">{t('newPasswordLabel')}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            aria-required="true"
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t('confirmPasswordLabel')}</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </fieldset>
    </form>
  )
}

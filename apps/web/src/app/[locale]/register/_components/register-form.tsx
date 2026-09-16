'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerUser, resendVerificationEmail } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { klaviyoIdentify } from '@/lib/analytics/klaviyo'

export function RegisterForm() {
  const t = useTranslations('auth')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendConfirmation, setResendConfirmation] = useState<string | null>(null)

  function validatePasswordStrength(value: string): string | null {
    if (value.length < 8) return t('errorPasswordWeak')
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return t('errorPasswordWeak')
    return null
  }

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    setPassword(value)
    // Clear inline error while user is typing so it doesn't distract mid-input
    if (passwordError !== null) setPasswordError(null)
  }

  function handlePasswordBlur() {
    setPasswordError(validatePasswordStrength(password))
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const strengthError = validatePasswordStrength(password)
    if (strengthError !== null) {
      setPasswordError(strengthError)
      return
    }

    setIsSubmitting(true)

    try {
      const { email: registered } = await registerUser(email, password)
      // Klaviyo needs a $email tag to attach flows even before verification —
      // registered profile is a valid lead for win-back / verification-reminder.
      klaviyoIdentify(registered)
      setRegisteredEmail(registered)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(t('errorEmailTaken'))
      } else {
        setErrorMessage(t('errorGeneric'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    if (!registeredEmail) return
    setIsResending(true)
    setResendConfirmation(null)
    try {
      await resendVerificationEmail(registeredEmail)
      // Endpoint is always 200 (never leaks existence). Message is generic on purpose.
      setResendConfirmation(t('verifyResendConfirmation'))
    } catch {
      setResendConfirmation(t('verifyResendConfirmation'))
    } finally {
      setIsResending(false)
    }
  }

  if (registeredEmail !== null) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('verifyCheckInboxTitle')}</h2>
          <p className="text-muted-foreground">
            {t('verifyCheckInboxBody', { email: registeredEmail })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={isResending}
          className="mt-2"
        >
          {isResending ? t('verifyResendSubmitting') : t('verifyResend')}
        </Button>
        {resendConfirmation !== null && (
          <p role="status" className="text-sm text-muted-foreground">
            {resendConfirmation}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={t('registerTitle')}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('registerTitle')}</legend>

        <div className="space-y-2">
          <Label htmlFor="register-email">{t('fieldEmail')}</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t('fieldEmailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">{t('fieldPassword')}</Label>
          <div className="relative">
            <Input
              id="register-password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('fieldPasswordPlaceholder')}
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              required
              aria-required="true"
              aria-describedby={passwordError !== null ? 'register-password-error' : undefined}
              aria-invalid={passwordError !== null}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              aria-label={isPasswordVisible ? t('hidePassword') : t('showPassword')}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {isPasswordVisible ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          {passwordError !== null && (
            <p id="register-password-error" role="alert" className="mt-1 text-sm text-destructive">
              {passwordError}
            </p>
          )}
        </div>

        {errorMessage !== null && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('registerSubmitting') : t('registerSubmit')}
        </Button>
      </fieldset>
    </form>
  )
}

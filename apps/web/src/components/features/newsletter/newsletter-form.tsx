'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { subscribeToNewsletter } from '@/lib/api/newsletter'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface NewsletterFormProps {
  // 'footer' renders compact inline layout, 'hero' renders larger centered layout.
  // Same logic, only Tailwind classes differ, keeping a single source of truth for the form.
  variant?: 'footer' | 'hero'
}

export function NewsletterForm({ variant = 'footer' }: NewsletterFormProps) {
  const t = useTranslations('newsletter')
  const pathname = usePathname()

  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setValidationError(null)
    setConsentError(null)

    const trimmed = email.trim()
    if (!EMAIL_REGEX.test(trimmed)) {
      setValidationError(t('errorInvalidEmail'))
      return
    }
    if (!consent) {
      setConsentError(t('errorConsentRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await subscribeToNewsletter({
        email: trimmed,
        consent: true,
        sourceUrl: pathname,
      })
      setIsSuccess(true)
      setEmail('')
      setConsent(false)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('errorGeneric')
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div
        role="status"
        className={
          variant === 'hero'
            ? 'mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-4'
            : 'flex items-start gap-2 rounded-md border border-border bg-card p-3'
        }
      >
        <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">{t('successTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('successMessage')}</p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('formLabel')}
      className={variant === 'hero' ? 'mx-auto w-full max-w-md' : 'w-full'}
    >
      <fieldset disabled={isSubmitting} className="space-y-3">
        <legend className="sr-only">{t('formLabel')}</legend>

        <Label htmlFor={`newsletter-email-${variant}`} className="text-sm font-medium">
          {t('label')}
        </Label>

        <div className={variant === 'hero' ? 'flex flex-col gap-2 sm:flex-row' : 'flex gap-2'}>
          <Input
            id={`newsletter-email-${variant}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('placeholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-required="true"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? `newsletter-error-${variant}` : undefined}
            className="flex-1"
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </div>

        {validationError && (
          <p id={`newsletter-error-${variant}`} role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor={`newsletter-consent-${variant}`}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <input
              id={`newsletter-consent-${variant}`}
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked)
                if (event.target.checked && consentError) setConsentError(null)
              }}
              required
              aria-required="true"
              aria-invalid={!!consentError}
              aria-describedby={consentError ? `newsletter-consent-error-${variant}` : undefined}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span>{t('consentLabel')}</span>
          </label>
          {consentError && (
            <p
              id={`newsletter-consent-error-${variant}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {consentError}
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
      </fieldset>
    </form>
  )
}

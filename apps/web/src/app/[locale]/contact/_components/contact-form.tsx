'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendContactMessage } from '@/lib/api/contact'

interface ContactFormState {
  name: string
  email: string
  subject: string
  message: string
}

interface ContactFormErrors {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactForm() {
  const t = useTranslations('contactPage')

  const [formValues, setFormValues] = useState<ContactFormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  function validateFields(values: ContactFormState): ContactFormErrors {
    const errors: ContactFormErrors = {}
    if (!values.name.trim()) errors.name = t('validationNameRequired')
    if (!EMAIL_REGEX.test(values.email)) errors.email = t('validationEmailInvalid')
    if (!values.subject.trim()) errors.subject = t('validationSubjectRequired')
    if (values.message.trim().length < 10) errors.message = t('validationMessageTooShort')
    return errors
  }

  function handleFieldChange(field: keyof ContactFormState, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    // Clear the error for this field as soon as the user edits it
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const errors = validateFields(formValues)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      await sendContactMessage(formValues)
      setIsSuccess(true)
    } catch {
      setSubmitError(t('errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle className="size-12 text-green-500" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{t('successTitle')}</h2>
          <p className="text-muted-foreground">{t('successMessage')}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={t('heroTitle')}>
      <fieldset disabled={isSubmitting} className="space-y-5">
        <legend className="sr-only">{t('heroTitle')}</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">{t('fieldName')}</Label>
            <Input
              id="contact-name"
              type="text"
              autoComplete="name"
              placeholder={t('fieldNamePlaceholder')}
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
            />
            {fieldErrors.name && (
              <p id="contact-name-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">{t('fieldEmail')}</Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder={t('fieldEmailPlaceholder')}
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="contact-email-error" role="alert" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-subject">{t('fieldSubject')}</Label>
          <Input
            id="contact-subject"
            type="text"
            placeholder={t('fieldSubjectPlaceholder')}
            value={formValues.subject}
            onChange={(event) => handleFieldChange('subject', event.target.value)}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.subject}
            aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
          />
          {fieldErrors.subject && (
            <p id="contact-subject-error" role="alert" className="text-sm text-destructive">
              {fieldErrors.subject}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">{t('fieldMessage')}</Label>
          <Textarea
            id="contact-message"
            placeholder={t('fieldMessagePlaceholder')}
            value={formValues.message}
            onChange={(event) => handleFieldChange('message', event.target.value)}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.message}
            aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
            className="min-h-36 resize-y"
            rows={5}
          />
          {fieldErrors.message && (
            <p id="contact-message-error" role="alert" className="text-sm text-destructive">
              {fieldErrors.message}
            </p>
          )}
        </div>

        {submitError !== null && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('submitButton')}
        </Button>
      </fieldset>
    </form>
  )
}

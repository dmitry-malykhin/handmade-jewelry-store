'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { fetchProfile, updateProfile } from '@/lib/api/users'
import { useAuthStore } from '@/store/auth.store'

export function ProfileForm() {
  const t = useTranslations('account.settings.profile')
  const accessToken = useAuthStore((state) => state.accessToken)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    fetchProfile(accessToken)
      .then((profile) => {
        if (cancelled) return
        setName(profile.name ?? '')
        setPhone(profile.phone ?? '')
        setEmail(profile.email)
      })
      .catch(() => {
        if (cancelled) return
        setValidationError(t('errorLoad'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, t])

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!accessToken) {
      setValidationError(t('errorUnauthorized'))
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updateProfile(accessToken, {
        name: name.trim(),
        phone: phone.trim(),
      })
      setName(updated.name ?? '')
      setPhone(updated.phone ?? '')
      toast.success(t('successMessage'))
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
      <fieldset disabled={isLoading || isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('title')}</legend>

        <h3 className="text-lg font-medium">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>

        <div className="space-y-2">
          <Label htmlFor="profile-email">{t('emailLabel')}</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            autoComplete="email"
          />
          <p className="text-xs text-muted-foreground">{t('emailReadOnlyHint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">{t('nameLabel')}</Label>
          <Input
            id="profile-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-phone">{t('phoneLabel')}</Label>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={30}
          />
        </div>

        {validationError !== null && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        <Button type="submit" disabled={isLoading || isSubmitting}>
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </fieldset>
    </form>
  )
}

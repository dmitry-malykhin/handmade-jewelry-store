'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import { registerUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export function RegisterForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const setTokens = useAuthStore((state) => state.setTokens)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const tokens = await registerUser(email, password)
      setTokens(tokens.accessToken, tokens.refreshToken)
      router.push('/')
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
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-required="true"
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

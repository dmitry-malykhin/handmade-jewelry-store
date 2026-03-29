'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import { loginUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export function LoginForm() {
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
      const tokens = await loginUser(email, password)
      setTokens(tokens.accessToken, tokens.refreshToken)
      router.push('/')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage(t('errorInvalidCredentials'))
      } else {
        setErrorMessage(t('errorGeneric'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={t('loginTitle')}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">{t('loginTitle')}</legend>

        <div className="space-y-2">
          <Label htmlFor="login-email">{t('fieldEmail')}</Label>
          <Input
            id="login-email"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">{t('fieldPassword')}</Label>
            {/* Forgot password link — will be added when #154 password reset is implemented */}
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
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
          {isSubmitting ? t('loginSubmitting') : t('loginSubmit')}
        </Button>
      </fieldset>
    </form>
  )
}

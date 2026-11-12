'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from '@/i18n/navigation'
import { ApiError } from '@/lib/api/client'
import { deleteOwnAccount } from '@/lib/api/users'
import { useAuthStore } from '@/store/auth.store'

// Must match DELETE_ACCOUNT_CONFIRMATION_PHRASE in UsersService exactly. Kept
// as an English constant on the client too so copy-paste from any locale's
// instructions resolves to the single canonical token the API compares.
const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT'

export function DeleteAccountCard() {
  const t = useTranslations('account.settings.deleteAccount')
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearTokens = useAuthStore((state) => state.clearTokens)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function closeModal() {
    setIsModalOpen(false)
    setPassword('')
    setConfirmationPhrase('')
    setError(null)
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!accessToken) {
      setError(t('errorUnauthorized'))
      return
    }
    if (!password || !confirmationPhrase) {
      setError(t('errorFieldsRequired'))
      return
    }
    if (confirmationPhrase !== CONFIRMATION_PHRASE) {
      setError(t('errorPhraseMismatch', { phrase: CONFIRMATION_PHRASE }))
      return
    }

    setIsSubmitting(true)
    try {
      await deleteOwnAccount(accessToken, password, confirmationPhrase)
      clearTokens()
      toast.success(t('success'))
      router.push('/')
    } catch (apiError) {
      if (apiError instanceof ApiError && apiError.status === 403) {
        setError(t('errorInvalidCredentials'))
      } else {
        setError(t('errorGeneric'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="delete-account-heading"
      className="space-y-4 rounded-lg border border-destructive/40 bg-card p-6"
    >
      <div>
        <h3 id="delete-account-heading" className="text-lg font-medium text-destructive">
          {t('title')}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Button type="button" variant="destructive" onClick={() => setIsModalOpen(true)}>
        {t('openButton')}
      </Button>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => (open ? setIsModalOpen(true) : closeModal())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('modalTitle')}</DialogTitle>
            <DialogDescription>
              {t('modalDescription', { phrase: CONFIRMATION_PHRASE })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-account-password">{t('passwordLabel')}</Label>
              <Input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-account-phrase">
                {t('phraseLabel', { phrase: CONFIRMATION_PHRASE })}
              </Label>
              <Input
                id="delete-account-phrase"
                type="text"
                autoComplete="off"
                value={confirmationPhrase}
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                {t('cancelButton')}
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? t('submittingButton') : t('confirmButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

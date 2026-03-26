'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { CheckoutAddressForm } from './checkout-address-form'

type CheckoutPath = 'guest' | 'auth' | null

export function CheckoutEntry() {
  const t = useTranslations('checkoutPage')
  const [selectedPath, setSelectedPath] = useState<CheckoutPath>(null)

  if (selectedPath === 'guest') {
    return <CheckoutAddressForm />
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">{t('entryTitle')}</h1>
      <p className="mb-8 text-muted-foreground">{t('entrySubtitle')}</p>

      <div className="space-y-4">
        {/* Guest path — primary CTA */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-1 font-semibold text-foreground">{t('guestTitle')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('guestDescription')}</p>
          <Button className="w-full" size="lg" onClick={() => setSelectedPath('guest')}>
            {t('continueAsGuest')}
          </Button>
        </div>

        {/* Auth path — secondary */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-1 font-semibold text-foreground">{t('authTitle')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('authDescription')}</p>
          {/* TODO #72: replace with real auth flow when JWT is implemented */}
          <Button variant="outline" className="w-full" size="lg" asChild>
            <Link href="/login">{t('signIn')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

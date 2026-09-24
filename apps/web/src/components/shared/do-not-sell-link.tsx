'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useCookieConsentStore, useDoNotSellOptedOut } from '@/store/cookie-consent.store'

export function DoNotSellLink() {
  const t = useTranslations('footer')
  const isOptedOut = useDoNotSellOptedOut()

  function handleClick() {
    useCookieConsentStore.getState().doNotSellOptOut()
    toast.success(t('doNotSellConfirm'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-muted-foreground hover:text-foreground"
      aria-label={t('doNotSellAriaLabel')}
    >
      {isOptedOut ? t('doNotSellOptedOut') : t('doNotSell')}
    </button>
  )
}

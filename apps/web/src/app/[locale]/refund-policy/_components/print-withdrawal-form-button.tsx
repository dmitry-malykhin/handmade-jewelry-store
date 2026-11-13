'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

// Trivial client wrapper: window.print exists only on the client, and a
// server-rendered <form> does not need any other interactivity. Printing is
// browser-native; CRD Annex I does not demand PDF, just a printable form.
export function PrintWithdrawalFormButton() {
  const t = useTranslations('refundPolicyPage')
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      {t('printButton')}
    </Button>
  )
}

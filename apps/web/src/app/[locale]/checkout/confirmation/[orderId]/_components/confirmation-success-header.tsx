import { CheckCircle, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ConfirmationSuccessHeaderProps {
  orderId: string
}

export function ConfirmationSuccessHeader({ orderId }: ConfirmationSuccessHeaderProps) {
  const t = useTranslations('confirmationPage')

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-10 w-10 text-green-500" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2">
        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t('emailNote')}</p>
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-3 text-left">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('orderIdLabel')}
        </span>
        <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{orderId}</p>
      </div>
    </div>
  )
}

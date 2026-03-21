import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

/**
 * Pure presentational component — reads translations via useTranslations.
 * No props needed: next-intl injects the correct locale automatically.
 * Server Component — useTranslations works on the server in next-intl.
 */
export function HeroSection() {
  const t = useTranslations('home')

  return (
    <div className="text-center">
      <Badge variant="secondary" className="mb-4">
        {t('badge')}
      </Badge>
      <h1 className="text-4xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{t('description')}</p>
    </div>
  )
}

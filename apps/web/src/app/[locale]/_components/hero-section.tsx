import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { NewsletterForm } from '@/components/features/newsletter/newsletter-form'

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
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-3 text-base text-muted-foreground sm:text-lg">{t('description')}</p>
      <div className="mt-8">
        <NewsletterForm variant="hero" />
      </div>
    </div>
  )
}

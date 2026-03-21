import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Status card with locale-aware Link (auto-prepends /en, /ru, /es).
 * Server Component.
 */
export function StatusCard() {
  const t = useTranslations('home')

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('statusTitle')}</CardTitle>
        <CardDescription>{t('statusDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('statusBody')}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild>
          <Link href="/shop">{t('shopNow')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/about">{t('learnMore')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

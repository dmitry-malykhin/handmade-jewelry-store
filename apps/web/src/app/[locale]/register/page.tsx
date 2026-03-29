import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { RegisterForm } from './_components/register-form'

interface RegisterPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return {
    title: t('registerMetaTitle'),
    description: t('registerMetaDescription'),
    alternates: {
      canonical: `/${locale}/register`,
    },
    openGraph: {
      title: t('registerMetaTitle'),
      description: t('registerMetaDescription'),
    },
  }
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('registerTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('registerSubtitle')}</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('signIn')}
          </Link>
        </p>
      </div>
    </main>
  )
}

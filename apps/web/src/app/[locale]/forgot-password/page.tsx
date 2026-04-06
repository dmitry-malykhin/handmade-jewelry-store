import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ForgotPasswordForm } from './_components/forgot-password-form'

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return {
    title: t('forgotPasswordMetaTitle'),
    description: t('forgotPasswordMetaDescription'),
    alternates: {
      canonical: `/${locale}/forgot-password`,
    },
    openGraph: {
      title: t('forgotPasswordMetaTitle'),
      description: t('forgotPasswordMetaDescription'),
    },
    robots: { index: false, follow: false },
  }
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('forgotPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('forgotPasswordDescription')}</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  )
}

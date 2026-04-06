import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ResetPasswordForm } from './_components/reset-password-form'

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return {
    title: t('resetPasswordMetaTitle'),
    description: t('resetPasswordMetaDescription'),
    alternates: {
      canonical: `/${locale}/reset-password`,
    },
    openGraph: {
      title: t('resetPasswordMetaTitle'),
      description: t('resetPasswordMetaDescription'),
    },
    robots: { index: false, follow: false },
  }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('resetPasswordTitle')}
          </h1>
        </div>

        {/* Suspense required because ResetPasswordForm uses useSearchParams */}
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}

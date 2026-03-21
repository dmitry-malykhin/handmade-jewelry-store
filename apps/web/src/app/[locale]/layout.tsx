import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, type Locale } from '@/i18n/routing'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import { StoreHydration } from '@/components/shared/store-hydration'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Locale-specific layout — wraps every page under /[locale]/.
 * Responsibilities:
 * 1. Validates the locale is supported (404 otherwise)
 * 2. Sets the request locale context for Server Components
 * 3. Provides all messages to the Client Component tree via NextIntlClientProvider
 * 4. Renders shared Header and Footer
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound()
  }

  // Required for static rendering with next-intl
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <StoreHydration />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {/* translated in Header — reusing same string key */}
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </NextIntlClientProvider>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`,
    },
    description: t('description'),
    openGraph: {
      type: 'website',
      locale,
      siteName: t('title'),
    },
    alternates: {
      languages: {
        en: '/en',
        ru: '/ru',
        es: '/es',
      },
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale: Locale) => ({ locale }))
}

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import { Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32x32.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Senichka',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Senichka — Handmade Beaded Jewelry' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1A19' },
  ],
}

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
})

const jost = Jost({
  subsets: ['latin', 'cyrillic'],
  weight: ['200', '300', '400', '500'],
  display: 'swap',
  variable: '--font-jost',
})

/**
 * Root layout — minimal by design.
 * All page content lives under app/[locale]/ which handles
 * Header, Footer, and NextIntlClientProvider.
 *
 * We read the locale from the x-next-intl-locale header that
 * next-intl middleware automatically sets on every response.
 * This gives us the correct <html lang> without duplicating the HTML structure.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const locale = headersList.get('x-next-intl-locale') ?? 'en'

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${cormorantGaramond.variable} ${jost.variable}`}
    >
      <head />
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="jewelry-theme"
        >
          {children}
          <Toaster richColors position="top-right" />
          {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
            <Suspense fallback={null}>
              <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
            </Suspense>
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}

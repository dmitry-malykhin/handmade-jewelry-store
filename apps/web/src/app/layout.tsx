import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import { Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { FacebookPixel } from '@/components/analytics/facebook-pixel'
import { PinterestTag } from '@/components/analytics/pinterest-tag'
import { Klaviyo } from '@/components/analytics/klaviyo'
import { MicrosoftClarity } from '@/components/analytics/microsoft-clarity'
import { PostHogAnalytics } from '@/components/analytics/posthog'
import { getImageCdnOrigin } from '@/lib/config/image-cdn'
import { getSiteUrl } from '@/lib/config/site-url'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
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
  ...((process.env.NEXT_PUBLIC_GSC_VERIFICATION_ID ||
    process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION_ID) && {
    verification: {
      ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION_ID && {
        google: process.env.NEXT_PUBLIC_GSC_VERIFICATION_ID,
      }),
      ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION_ID && {
        other: { 'p:domain_verify': process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION_ID },
      }),
    },
  }),
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

// Page content lives under app/[locale]/ — this layout only handles <html>,
// fonts, theme, and analytics scripts. Locale comes from the x-next-intl-locale
// header so <html lang> is right without duplicating the layout.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const locale = headersList.get('x-next-intl-locale') ?? 'en'
  const imageCdnOrigin = getImageCdnOrigin()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${cormorantGaramond.variable} ${jost.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {/* Do NOT wrap in an explicit <head> — it breaks Next's metadata
            hoisting from child segments (description ends up in <body>). */}
        {imageCdnOrigin && (
          <>
            <link rel="preconnect" href={imageCdnOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={imageCdnOrigin} />
          </>
        )}
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
          {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
            <FacebookPixel pixelId={process.env.NEXT_PUBLIC_FB_PIXEL_ID} />
          )}
          {process.env.NEXT_PUBLIC_PINTEREST_TAG_ID && (
            <PinterestTag tagId={process.env.NEXT_PUBLIC_PINTEREST_TAG_ID} />
          )}
          {process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID && (
            <Klaviyo companyId={process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID} />
          )}
          {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
            <Suspense fallback={null}>
              <PostHogAnalytics
                apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
                host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
              />
            </Suspense>
          )}
          {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
            <MicrosoftClarity projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID} />
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}

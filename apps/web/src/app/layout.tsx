import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/shared/theme-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
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
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

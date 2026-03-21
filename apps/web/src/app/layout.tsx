import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // prevents FOIT — text shown in fallback font while Inter loads
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Handmade Jewelry Store',
    template: '%s | Handmade Jewelry Store',
  },
  description: 'Unique handmade jewelry crafted with love using ethically sourced materials.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Handmade Jewelry Store',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {/*
         * Skip navigation — invisible until focused via Tab key.
         * Required for WCAG 2.1 AA: lets keyboard/screen reader users
         * jump directly to main content, bypassing the repeated header.
         */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <Header />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  )
}

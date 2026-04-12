import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from './_components/contact-form'

interface ContactPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contactPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { en: '/en/contact', ru: '/ru/contact', es: '/es/contact' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/contact`,
    },
  }
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('contactPage')

  return (
    <main>
      <section className="bg-accent/30 px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('heroSubtitle')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <ContactForm />
      </div>
    </main>
  )
}

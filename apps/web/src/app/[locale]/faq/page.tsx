import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { generateFaqJsonLd } from '@/lib/seo/json-ld'

// 9 question keys exposed as a const tuple so JSON-LD and the rendered
// accordion stay in sync — adding a question = one entry here + 2 i18n keys.
const FAQ_KEYS = [
  'shippingTime',
  'returnsPolicy',
  'ringSizing',
  'materials',
  'giftWrap',
  'customsDuties',
  'lostPackage',
  'customOrders',
  'careBasics',
] as const

interface FaqPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'faqPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/faq`,
      languages: { en: '/en/faq', ru: '/ru/faq', es: '/es/faq' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: `/${locale}/faq`,
    },
  }
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('faqPage')

  // FAQPage JSON-LD must mirror EVERY rendered Q&A — otherwise Google rejects
  // the rich result. Build from the same FAQ_KEYS source.
  const faqJsonLd = generateFaqJsonLd(
    FAQ_KEYS.map((key) => ({
      question: t(`q_${key}_question`),
      answer: t(`q_${key}_answer`),
    })),
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{t('subtitle')}</p>
      </header>

      <article aria-labelledby="faq-heading" className="space-y-3">
        <h2 id="faq-heading" className="sr-only">
          {t('listHeading')}
        </h2>
        {FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group rounded-lg border border-border bg-card p-4 open:bg-accent/20"
          >
            <summary className="cursor-pointer list-none text-base font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="flex items-start justify-between gap-3">
                <span>{t(`q_${key}_question`)}</span>
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t(`q_${key}_answer`)}
            </p>
          </details>
        ))}
      </article>
    </main>
  )
}

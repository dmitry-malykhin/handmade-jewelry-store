import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AboutPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'aboutPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: '/en/about', ru: '/ru/about', es: '/es/about' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/about`,
    },
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('aboutPage')

  return (
    <main>
      {/* Hero */}
      <section className="bg-accent/30 px-4 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('heroSubtitle')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        {/* Brand Story */}
        <article className="mb-20">
          <h2 className="mb-6 text-2xl font-semibold text-foreground">{t('storyTitle')}</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>{t('storyParagraph1')}</p>
            <p>{t('storyParagraph2')}</p>
          </div>
        </article>

        {/* Handmade Process */}
        <section className="mb-20" aria-labelledby="process-heading">
          <h2 id="process-heading" className="mb-8 text-2xl font-semibold text-foreground">
            {t('processTitle')}
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2" role="list">
            {(
              [
                { titleKey: 'processStep1Title', descKey: 'processStep1Description', step: 1 },
                { titleKey: 'processStep2Title', descKey: 'processStep2Description', step: 2 },
                { titleKey: 'processStep3Title', descKey: 'processStep3Description', step: 3 },
                { titleKey: 'processStep4Title', descKey: 'processStep4Description', step: 4 },
              ] as const
            ).map(({ titleKey, descKey, step }) => (
              <li key={step} className="rounded-lg border border-border bg-card p-6">
                <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
                  {step < 10 ? `0${step}` : step}
                </span>
                <h3 className="mb-2 font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(descKey)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Materials */}
        <section className="mb-20" aria-labelledby="materials-heading">
          <h2 id="materials-heading" className="mb-8 text-2xl font-semibold text-foreground">
            {t('materialsTitle')}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3" role="list">
            {(
              [
                { titleKey: 'materialsSilverTitle', descKey: 'materialsSilverDescription' },
                { titleKey: 'materialsGemstonesTitle', descKey: 'materialsGemstonesDescription' },
                { titleKey: 'materialsFinishTitle', descKey: 'materialsFinishDescription' },
              ] as const
            ).map(({ titleKey, descKey }) => (
              <li key={titleKey} className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(descKey)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Values */}
        <section className="mb-20" aria-labelledby="values-heading">
          <h2 id="values-heading" className="mb-8 text-2xl font-semibold text-foreground">
            {t('valuesTitle')}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3" role="list">
            {(
              [
                { titleKey: 'valuesCraftTitle', descKey: 'valuesCraftDescription' },
                {
                  titleKey: 'valuesSustainabilityTitle',
                  descKey: 'valuesSustainabilityDescription',
                },
                { titleKey: 'valuesConnectionTitle', descKey: 'valuesConnectionDescription' },
              ] as const
            ).map(({ titleKey, descKey }) => (
              <li key={titleKey} className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(descKey)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-accent/30 px-8 py-12 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">{t('ctaTitle')}</h2>
          <Button asChild size="lg">
            <Link href="/shop">{t('ctaButton')}</Link>
          </Button>
        </section>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { en: '/en/privacy', ru: '/ru/privacy', es: '/es/privacy' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/privacy`,
    },
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('privacyPage')

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mb-12 text-sm text-muted-foreground">{t('lastUpdated')}</p>

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          <section aria-labelledby="privacy-intro">
            <p className="text-muted-foreground">
              This Privacy Policy explains how Handmade Jewelry Store (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal
              information when you visit our website or make a purchase. By using our site, you
              agree to the practices described here.
            </p>
          </section>

          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect" className="mb-4 text-xl font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>
                <strong>Account information</strong> — name, email address, and password when you
                create an account.
              </li>
              <li>
                <strong>Order information</strong> — shipping address, billing details, and purchase
                history when you place an order.
              </li>
              <li>
                <strong>Payment information</strong> — processed securely by Stripe. We never store
                your full card number.
              </li>
              <li>
                <strong>Contact messages</strong> — name, email, and message content when you use
                our contact form.
              </li>
              <li>
                <strong>Usage data</strong> — pages visited, time on site, and browser/device type
                via analytics tools (see Section 4).
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-use">
            <h2 id="privacy-use" className="mb-4 text-xl font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>To process and fulfill your orders, including shipping notifications.</li>
              <li>To send transactional emails (order confirmations, shipping updates).</li>
              <li>To respond to your support and contact inquiries.</li>
              <li>
                To send marketing emails if you have opted in (you can unsubscribe at any time).
              </li>
              <li>To improve the website and understand how visitors use it.</li>
              <li>To prevent fraud and maintain security.</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-sharing">
            <h2 id="privacy-sharing" className="mb-4 text-xl font-semibold text-foreground">
              3. Sharing Your Information
            </h2>
            <p className="mb-4 text-muted-foreground">
              We do not sell your personal data. We share information only with trusted service
              providers necessary to operate our store:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>
                <strong>Stripe</strong> — payment processing. Subject to{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Stripe&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery (order confirmations,
                password resets).
              </li>
              <li>
                <strong>Klaviyo</strong> — email marketing, only if you have opted in to marketing
                communications.
              </li>
              <li>
                <strong>Shipping carriers</strong> — your name and delivery address are shared with
                the carrier fulfilling your order.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-analytics">
            <h2 id="privacy-analytics" className="mb-4 text-xl font-semibold text-foreground">
              4. Analytics and Tracking
            </h2>
            <p className="mb-4 text-muted-foreground">
              We use the following tools to understand how visitors use our site. These tools may
              set cookies and collect usage data. They are only activated after you provide cookie
              consent.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>
                <strong>Google Analytics 4</strong> — aggregate site traffic and e-commerce
                analytics.
              </li>
              <li>
                <strong>PostHog</strong> — product analytics and feature usage.
              </li>
              <li>
                <strong>Microsoft Clarity</strong> — session recordings and heatmaps to improve UX.
              </li>
              <li>
                <strong>Facebook Pixel</strong> — conversion tracking for Facebook and Instagram
                advertising.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-cookies">
            <h2 id="privacy-cookies" className="mb-4 text-xl font-semibold text-foreground">
              5. Cookies
            </h2>
            <p className="mb-4 text-muted-foreground">We use the following types of cookies:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>
                <strong>Strictly necessary</strong> — required for the site to function (cart,
                session, security). Cannot be disabled.
              </li>
              <li>
                <strong>Analytics</strong> — help us understand how the site is used. Require your
                consent.
              </li>
              <li>
                <strong>Marketing</strong> — used for advertising and remarketing. Require your
                consent.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              You can manage your cookie preferences at any time via the cookie consent banner or
              your browser settings.
            </p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="mb-4 text-xl font-semibold text-foreground">
              6. Data Retention
            </h2>
            <p className="text-muted-foreground">
              We retain your personal data only as long as necessary to provide our services and
              comply with legal obligations. Order data is retained for 7 years for tax and
              accounting purposes. Account data is retained until you request deletion. Marketing
              consent records are retained until you withdraw consent.
            </p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="mb-4 text-xl font-semibold text-foreground">
              7. Your Rights (GDPR / CCPA)
            </h2>
            <p className="mb-4 text-muted-foreground">
              Depending on where you live, you may have the following rights regarding your personal
              data:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>
                <strong>Access</strong> — request a copy of the data we hold about you.
              </li>
              <li>
                <strong>Correction</strong> — ask us to correct inaccurate data.
              </li>
              <li>
                <strong>Deletion</strong> — request that we delete your personal data (&quot;right
                to be forgotten&quot;).
              </li>
              <li>
                <strong>Portability</strong> — receive your data in a machine-readable format.
              </li>
              <li>
                <strong>Opt-out of sale</strong> — California residents: we do not sell personal
                data.
              </li>
              <li>
                <strong>Withdraw consent</strong> — withdraw marketing or analytics consent at any
                time.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@example.com" className="underline hover:text-foreground">
                privacy@example.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section aria-labelledby="privacy-security">
            <h2 id="privacy-security" className="mb-4 text-xl font-semibold text-foreground">
              8. Security
            </h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures including HTTPS encryption, bcrypt password
              hashing, and secure payment processing via Stripe. No method of transmission over the
              Internet is 100% secure, but we take reasonable steps to protect your data.
            </p>
          </section>

          <section aria-labelledby="privacy-children">
            <h2 id="privacy-children" className="mb-4 text-xl font-semibold text-foreground">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground">
              Our website is not directed at children under 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with their
              information, please contact us and we will delete it.
            </p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes" className="mb-4 text-xl font-semibold text-foreground">
              10. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by updating the &quot;Last updated&quot; date at the top of this page. Your
              continued use of the site after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section aria-labelledby="privacy-contact">
            <h2 id="privacy-contact" className="mb-4 text-xl font-semibold text-foreground">
              11. Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or how we handle your data, please
              contact us:
            </p>
            <address className="mt-4 not-italic text-muted-foreground">
              <p>Handmade Jewelry Store</p>
              <p>
                Email:{' '}
                <a href="mailto:privacy@example.com" className="underline hover:text-foreground">
                  privacy@example.com
                </a>
              </p>
            </address>
          </section>
        </div>
      </div>
    </main>
  )
}

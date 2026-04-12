import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

interface TermsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'termsPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/terms`,
      languages: { en: '/en/terms', ru: '/ru/terms', es: '/es/terms' },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: `/${locale}/terms`,
    },
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('termsPage')

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mb-12 text-sm text-muted-foreground">{t('lastUpdated')}</p>

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          {/* Intro */}
          <section>
            <p className="text-muted-foreground">
              Please read these Terms of Service (&quot;Terms&quot;) carefully before placing an
              order or using the Handmade Jewelry Store website (&quot;Site&quot;). By accessing the
              Site or completing a purchase, you agree to be bound by these Terms. If you do not
              agree, please do not use the Site.
            </p>
          </section>

          {/* 1. Products and Orders */}
          <section aria-labelledby="terms-products">
            <h2 id="terms-products" className="mb-4 text-xl font-semibold text-foreground">
              1. Products and Orders
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>
                All jewelry is handmade to order. Slight variations in color, texture, and
                dimensions are inherent to the handmade process and are not considered defects.
              </li>
              <li>
                Product images are representative. Actual appearance may differ slightly due to
                monitor calibration and natural variation in gemstones and metals.
              </li>
              <li>
                We reserve the right to cancel an order at any time if we are unable to fulfill it
                (for example, due to material unavailability). In such cases, a full refund will be
                issued promptly.
              </li>
              <li>
                By placing an order, you confirm that the information you provide (name, shipping
                address, payment details) is accurate and complete.
              </li>
            </ul>
          </section>

          {/* 2. Pricing and Payment */}
          <section aria-labelledby="terms-pricing">
            <h2 id="terms-pricing" className="mb-4 text-xl font-semibold text-foreground">
              2. Pricing and Payment
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>
                All prices are displayed in US Dollars (USD) and do not include applicable taxes.
              </li>
              <li>
                Sales tax may be applied at checkout depending on your shipping address and
                applicable local laws.
              </li>
              <li>
                Payment is processed securely by Stripe. We accept major credit and debit cards,
                Apple Pay, Google Pay, and select buy-now-pay-later options (Klarna, Afterpay).
              </li>
              <li>
                Your card is charged at the time of order placement. We do not store your full
                payment card details.
              </li>
              <li>
                Prices are subject to change without notice. The price displayed at the time of
                order confirmation is final for that order.
              </li>
            </ul>
          </section>

          {/* 3. Production and Shipping */}
          <section aria-labelledby="terms-shipping">
            <h2 id="terms-shipping" className="mb-4 text-xl font-semibold text-foreground">
              3. Production and Shipping
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>
                Each piece is handcrafted after your order is placed. Production typically takes
                5–10 business days before shipment.
              </li>
              <li>
                Estimated delivery times are provided for reference only and are not guaranteed.
                Delays caused by carriers, customs, or events outside our control are not our
                responsibility.
              </li>
              <li>
                We ship to addresses within the United States and internationally. International
                orders may be subject to import duties and taxes levied by the destination country,
                which are the buyer&apos;s responsibility.
              </li>
              <li>
                Risk of loss passes to you upon confirmed delivery to your address. If a package is
                lost in transit before delivery, please contact us and we will work with the carrier
                to resolve the issue or issue a replacement or refund.
              </li>
            </ul>
          </section>

          {/* 4. Returns and Refunds */}
          <section aria-labelledby="terms-returns">
            <h2 id="terms-returns" className="mb-4 text-xl font-semibold text-foreground">
              4. Returns and Refunds
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>
                We accept returns within <strong>14 days</strong> of delivery. Items should be
                returned unworn and undamaged; original packaging is appreciated but not required.
              </li>
              <li>
                Custom or personalized pieces (engraved, resized to a specific size on request) are
                exempt from our standard return policy unless they arrive defective or damaged.{' '}
                <strong>
                  EU consumers retain statutory rights under applicable consumer protection law
                  regardless of this policy.
                </strong>
              </li>
              <li>
                To initiate a return, contact us at{' '}
                <a href="mailto:support@example.com" className="underline hover:text-foreground">
                  support@example.com
                </a>{' '}
                within the return window with your order number and reason for return.
              </li>
              <li>
                Return shipping costs are the buyer&apos;s responsibility unless the item arrived
                damaged or incorrect.
              </li>
              <li>
                Refunds are processed to the original payment method within 5–10 business days after
                we receive and inspect the returned item. Original outbound shipping costs are
                refunded for defective or incorrect items.
              </li>
            </ul>
          </section>

          {/* 5. Intellectual Property */}
          <section aria-labelledby="terms-ip">
            <h2 id="terms-ip" className="mb-4 text-xl font-semibold text-foreground">
              5. Intellectual Property
            </h2>
            <p className="text-muted-foreground">
              All content on this Site — including product designs, photographs, text, logos, and
              graphics — is the exclusive property of Handmade Jewelry Store and is protected by
              copyright law. You may not reproduce, distribute, or use any content without our prior
              written permission. You are welcome to share links to our products on social media for
              personal, non-commercial purposes.
            </p>
          </section>

          {/* 6. User Accounts */}
          <section aria-labelledby="terms-accounts">
            <h2 id="terms-accounts" className="mb-4 text-xl font-semibold text-foreground">
              6. User Accounts
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-muted-foreground" role="list">
              <li>
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities that occur under your account.
              </li>
              <li>
                You must notify us immediately if you suspect unauthorized access to your account.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that violate these Terms or
                engage in fraudulent activity.
              </li>
            </ul>
          </section>

          {/* 7. Prohibited Uses */}
          <section aria-labelledby="terms-prohibited">
            <h2 id="terms-prohibited" className="mb-4 text-xl font-semibold text-foreground">
              7. Prohibited Uses
            </h2>
            <p className="mb-4 text-muted-foreground">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground" role="list">
              <li>Use the Site for any unlawful purpose or in violation of these Terms.</li>
              <li>
                Attempt to gain unauthorized access to any part of the Site or its infrastructure.
              </li>
              <li>Submit false, fraudulent, or misleading orders, reviews, or contact messages.</li>
              <li>
                Scrape, crawl, or harvest content from the Site without our express written consent.
              </li>
              <li>Resell our products without prior written authorization.</li>
            </ul>
          </section>

          {/* 8. Disclaimer of Warranties */}
          <section aria-labelledby="terms-disclaimer">
            <h2 id="terms-disclaimer" className="mb-4 text-xl font-semibold text-foreground">
              8. Disclaimer of Warranties
            </h2>
            <p className="mb-4 text-muted-foreground">
              The Site and its content are provided &quot;as is&quot; and &quot;as available&quot;
              without warranties of any kind, either express or implied, including but not limited
              to warranties of merchantability, fitness for a particular purpose, or
              non-infringement. We do not warrant that the Site will be uninterrupted, error-free,
              or free of viruses or other harmful components.
            </p>
            <p className="text-muted-foreground">
              Nothing in this section limits or excludes any statutory rights you may have as a
              consumer under the laws of your country, including the EU Sale of Goods Directive
              (2-year legal guarantee on physical goods) or equivalent consumer protection
              legislation. These statutory rights are not affected by these Terms.
            </p>
          </section>

          {/* 9. Limitation of Liability */}
          <section aria-labelledby="terms-liability">
            <h2 id="terms-liability" className="mb-4 text-xl font-semibold text-foreground">
              9. Limitation of Liability
            </h2>
            <p className="mb-4 text-muted-foreground">
              To the fullest extent permitted by applicable law, Handmade Jewelry Store shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of the Site or purchase of products. Our total liability for any
              claim arising from a purchase shall not exceed the amount you paid for the specific
              order giving rise to the claim.
            </p>
            <p className="text-muted-foreground">
              Nothing in this section limits our liability for death or personal injury caused by
              our negligence, fraud or fraudulent misrepresentation, or any other liability that
              cannot be excluded or limited under applicable law. Mandatory consumer protection
              rights under the laws of your country of residence are not affected by these Terms.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section aria-labelledby="terms-law">
            <h2 id="terms-law" className="mb-4 text-xl font-semibold text-foreground">
              10. Governing Law
            </h2>
            <p className="mb-4 text-muted-foreground">
              These Terms are governed by and construed in accordance with the laws of the United
              States and the state in which our business is registered, without regard to conflict
              of law principles. Any disputes arising from these Terms or your use of the Site shall
              be resolved in the courts of that jurisdiction.
            </p>
            <p className="text-muted-foreground">
              If you are a consumer resident in the European Union, you also benefit from the
              mandatory protective provisions of the law of the country in which you reside, and
              nothing in these Terms affects your right to rely on those provisions or to bring
              proceedings in the courts of your country of residence.
            </p>
          </section>

          {/* 11. Changes to These Terms */}
          <section aria-labelledby="terms-changes">
            <h2 id="terms-changes" className="mb-4 text-xl font-semibold text-foreground">
              11. Changes to These Terms
            </h2>
            <p className="text-muted-foreground">
              We reserve the right to update these Terms at any time. Changes will be posted on this
              page with an updated &quot;Last updated&quot; date. Your continued use of the Site
              after changes are posted constitutes your acceptance of the revised Terms. We
              encourage you to review this page periodically.
            </p>
          </section>

          {/* 12. Contact */}
          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact" className="mb-4 text-xl font-semibold text-foreground">
              12. Contact Us
            </h2>
            <p className="mb-4 text-muted-foreground">
              If you have questions about these Terms, please contact us:
            </p>
            <address className="not-italic text-muted-foreground">
              <p>Handmade Jewelry Store</p>
              <p>
                Email:{' '}
                <a href="mailto:legal@example.com" className="underline hover:text-foreground">
                  legal@example.com
                </a>
              </p>
            </address>
            <p className="mt-6 text-sm text-muted-foreground">
              For our privacy practices, see our{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}

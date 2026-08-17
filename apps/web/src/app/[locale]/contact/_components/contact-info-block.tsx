import { Mail, MapPin, Clock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getCompanyAddress, getSupportEmail } from '@/lib/config/contact'

interface ContactInfoBlockProps {
  locale: string
}

export async function ContactInfoBlock({ locale }: ContactInfoBlockProps) {
  const t = await getTranslations({ locale, namespace: 'contactPage' })
  const supportEmail = getSupportEmail()
  const companyAddress = getCompanyAddress()

  return (
    <section
      aria-labelledby="contact-info-heading"
      className="mb-10 rounded-lg border border-border bg-card p-6"
    >
      <h2 id="contact-info-heading" className="text-lg font-semibold text-foreground">
        {t('infoBlockTitle')}
      </h2>
      <p className="mt-1 text-sm font-medium text-foreground">{t('infoBlockBusinessName')}</p>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-muted-foreground">{t('infoBlockEmailLabel')}</dt>
            <dd className="text-foreground">
              <a href={`mailto:${supportEmail}`} className="hover:underline">
                {supportEmail}
              </a>
            </dd>
          </div>
        </div>

        {companyAddress && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="text-muted-foreground">{t('infoBlockAddressLabel')}</dt>
              <dd className="text-foreground">{companyAddress}</dd>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-muted-foreground">{t('infoBlockHoursLabel')}</dt>
            <dd className="text-foreground">{t('infoBlockHoursValue')}</dd>
          </div>
        </div>
      </dl>
    </section>
  )
}

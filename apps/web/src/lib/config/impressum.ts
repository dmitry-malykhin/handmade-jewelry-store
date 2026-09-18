// Trader identity for EU Impressum (§5 TMG / EU CRD Art. 6). Values come from
// env at build time — before the business is formally incorporated they show
// placeholders that make it obvious the deploy is not yet legally launch-ready.
export interface ImpressumConfig {
  legalName: string
  addressLine1: string
  addressLine2?: string
  city: string
  postalCode: string
  country: string
  email: string
  phone?: string
  registerCourt?: string
  registerNumber?: string
  vatId?: string
  responsiblePerson?: string
}

export function getImpressumConfig(): ImpressumConfig {
  return {
    legalName: process.env.NEXT_PUBLIC_IMPRESSUM_LEGAL_NAME ?? '[Legal name not set]',
    addressLine1: process.env.NEXT_PUBLIC_IMPRESSUM_ADDRESS_LINE1 ?? '[Address line 1 not set]',
    addressLine2: process.env.NEXT_PUBLIC_IMPRESSUM_ADDRESS_LINE2 || undefined,
    city: process.env.NEXT_PUBLIC_IMPRESSUM_CITY ?? '[City not set]',
    postalCode: process.env.NEXT_PUBLIC_IMPRESSUM_POSTAL_CODE ?? '[Postal code not set]',
    country: process.env.NEXT_PUBLIC_IMPRESSUM_COUNTRY ?? '[Country not set]',
    email: process.env.NEXT_PUBLIC_IMPRESSUM_EMAIL ?? '[Email not set]',
    phone: process.env.NEXT_PUBLIC_IMPRESSUM_PHONE || undefined,
    registerCourt: process.env.NEXT_PUBLIC_IMPRESSUM_REGISTER_COURT || undefined,
    registerNumber: process.env.NEXT_PUBLIC_IMPRESSUM_REGISTER_NUMBER || undefined,
    vatId: process.env.NEXT_PUBLIC_IMPRESSUM_VAT_ID || undefined,
    responsiblePerson: process.env.NEXT_PUBLIC_IMPRESSUM_RESPONSIBLE_PERSON || undefined,
  }
}

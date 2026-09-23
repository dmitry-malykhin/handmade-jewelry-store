// Legal sender identity embedded in every email footer.
// CAN-SPAM 15 U.S.C. §7704(a)(5) requires a valid physical postal address in
// every commercial email; EU CRD Art. 6(1) and §5 TMG require it for the
// trader identity. Values must match the /impressum page identity.
export interface StoreIdentity {
  legalName: string
  addressLine1: string
  addressLine2?: string
  city: string
  postalCode: string
  country: string
  contactEmail: string
}

export function getStoreIdentity(): StoreIdentity {
  return {
    legalName: process.env.STORE_LEGAL_NAME ?? '[Legal name not set]',
    addressLine1: process.env.STORE_ADDRESS_LINE1 ?? '[Address line 1 not set]',
    addressLine2: process.env.STORE_ADDRESS_LINE2 || undefined,
    city: process.env.STORE_CITY ?? '[City not set]',
    postalCode: process.env.STORE_POSTAL_CODE ?? '[Postal code not set]',
    country: process.env.STORE_COUNTRY ?? '[Country not set]',
    contactEmail: process.env.STORE_CONTACT_EMAIL ?? '[Contact email not set]',
  }
}

export function formatStoreAddress(identity: StoreIdentity): string {
  const parts = [
    identity.legalName,
    identity.addressLine1,
    identity.addressLine2,
    `${identity.postalCode} ${identity.city}`,
    identity.country,
  ]
  return parts.filter(Boolean).join(', ')
}

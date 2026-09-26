// Data Protection Officer / EU representative contact used on the Privacy
// Policy page (GDPR Art. 27 + Art. 37). Both come from env vars so a future
// change of representative does not require a redeploy of translations.
export interface DpoConfig {
  dpoEmail: string
  euRepresentativeName?: string
  euRepresentativeAddress?: string
  euRepresentativeEmail?: string
}

export function getDpoConfig(): DpoConfig {
  return {
    dpoEmail: process.env.NEXT_PUBLIC_DPO_EMAIL ?? '[DPO email not set]',
    euRepresentativeName: process.env.NEXT_PUBLIC_EU_REPRESENTATIVE_NAME || undefined,
    euRepresentativeAddress: process.env.NEXT_PUBLIC_EU_REPRESENTATIVE_ADDRESS || undefined,
    euRepresentativeEmail: process.env.NEXT_PUBLIC_EU_REPRESENTATIVE_EMAIL || undefined,
  }
}

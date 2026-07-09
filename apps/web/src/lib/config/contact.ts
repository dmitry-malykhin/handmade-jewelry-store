// FTC/CAN-SPAM: a placeholder address in the Privacy Policy invalidates it.
// Prod throws when the env var is empty; dev returns a *.local fallback.

const DEV_FALLBACKS = {
  privacyEmail: 'privacy@handmade-jewelry.local',
  supportEmail: 'support@handmade-jewelry.local',
  legalEmail: 'legal@handmade-jewelry.local',
} as const

const warned = new Set<string>()

function readOrThrow(envName: string, devFallback: string): string {
  const raw = process.env[envName]
  if (raw && raw.trim() !== '') return raw.trim()

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${envName} is not set. Legal / contact pages cannot render a valid address. ` +
        `Set the env var on your hosting platform (Vercel / Fly.io secrets) and redeploy.`,
    )
  }

  if (!warned.has(envName)) {
    console.warn(
      `[contact] ${envName} is empty — using dev fallback "${devFallback}". ` +
        `Set it in apps/web/.env.local before shipping.`,
    )
    warned.add(envName)
  }
  return devFallback
}

export function getPrivacyEmail(): string {
  return readOrThrow('NEXT_PUBLIC_PRIVACY_EMAIL', DEV_FALLBACKS.privacyEmail)
}

export function getSupportEmail(): string {
  return readOrThrow('NEXT_PUBLIC_SUPPORT_EMAIL', DEV_FALLBACKS.supportEmail)
}

export function getLegalEmail(): string {
  return readOrThrow('NEXT_PUBLIC_LEGAL_EMAIL', DEV_FALLBACKS.legalEmail)
}

// Soft (returns '' when unset) — pages hide the address block instead
// of throwing so staging can deploy before the postal address is finalised.
export function getCompanyAddress(): string {
  return (process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? '').trim()
}

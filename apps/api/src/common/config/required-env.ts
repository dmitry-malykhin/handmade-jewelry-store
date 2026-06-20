// Production: crash on first missing required var with one readable block —
// easier than chasing one var at a time. Dev/test: warn only.

type EnvCheck = {
  name: string
  description: string
}

const REQUIRED_IN_PRODUCTION: ReadonlyArray<EnvCheck> = [
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string' },
  { name: 'JWT_SECRET', description: 'JWT access-token signing secret' },
  { name: 'JWT_REFRESH_SECRET', description: 'JWT refresh-token signing secret' },
  { name: 'STRIPE_SECRET_KEY', description: 'Stripe API secret key (sk_live_…)' },
  { name: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signing secret (whsec_…)' },
  { name: 'RESEND_API_KEY', description: 'Resend transactional-email API key' },
  {
    name: 'RESEND_FROM_ADDRESS',
    description: 'From-address used for every outbound email — must be on a verified Resend domain',
  },
  {
    name: 'STORE_OWNER_EMAIL',
    description: 'Where contact-form messages are delivered',
  },
  {
    name: 'FRONTEND_URL',
    description: 'Public URL of the Next.js frontend — used in CORS, emails, password-reset links',
  },
  { name: 'AWS_S3_BUCKET', description: 'Object-storage bucket for product images' },
  { name: 'AWS_ACCESS_KEY_ID', description: 'Object-storage access key' },
  { name: 'AWS_SECRET_ACCESS_KEY', description: 'Object-storage secret key' },
  { name: 'AWS_S3_PUBLIC_URL_PREFIX', description: 'Public CDN/bucket prefix for image URLs' },
]

// Recommended (warned), not required (fatal).
const RECOMMENDED_IN_PRODUCTION: ReadonlyArray<EnvCheck> = [
  { name: 'SENTRY_DSN', description: 'Sentry error-tracking DSN' },
  { name: 'POSTHOG_API_KEY', description: 'PostHog server-side event capture' },
  { name: 'KLAVIYO_PRIVATE_API_KEY', description: 'Klaviyo email-marketing API key' },
]

export interface ValidationReport {
  missing: EnvCheck[]
  warnings: string[]
}

export function validateRequiredEnv(env: NodeJS.ProcessEnv): ValidationReport {
  const missing = REQUIRED_IN_PRODUCTION.filter(({ name }) => isEmpty(env[name]))
  const warnings: string[] = []

  for (const { name, description } of RECOMMENDED_IN_PRODUCTION) {
    if (isEmpty(env[name])) {
      warnings.push(`Recommended var ${name} not set — ${description}`)
    }
  }

  // FRONTEND_URL = localhost in prod almost always means a deploy mistake —
  // emails and CORS would point at the wrong host.
  const frontendUrl = env.FRONTEND_URL ?? ''
  if (frontendUrl.startsWith('http://localhost') || frontendUrl.startsWith('http://127.')) {
    warnings.push(
      `FRONTEND_URL points at localhost (${frontendUrl}) — emails and CORS will break in production`,
    )
  }

  return { missing, warnings }
}

export function assertProductionEnv(
  env: NodeJS.ProcessEnv = process.env,
  logger: { warn: (m: string) => void; error: (m: string) => void } = console,
): void {
  if (env.NODE_ENV !== 'production') return

  const { missing, warnings } = validateRequiredEnv(env)

  for (const warning of warnings) logger.warn(warning)

  if (missing.length === 0) return

  const lines = missing.map(({ name, description }) => `  - ${name} — ${description}`)
  const message = [
    `Refusing to start: ${missing.length} required environment variable(s) missing in production:`,
    ...lines,
    '',
    'Set them via your deploy platform (Fly.io secrets, Vercel env vars, Kubernetes secrets) and redeploy.',
  ].join('\n')

  logger.error(message)
  throw new Error(message)
}

function isEmpty(value: string | undefined): boolean {
  return value === undefined || value.trim() === ''
}

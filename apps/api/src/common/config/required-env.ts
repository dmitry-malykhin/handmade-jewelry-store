/**
 * Startup environment-variable validator. Run from `main.ts` before
 * `NestFactory.create`. In production a missing required var crashes the
 * process with a single readable message instead of letting the app boot
 * and explode later inside a controller.
 *
 * In non-production (`development`, `test`) we only warn — local devs can
 * boot the API without every integration set up.
 *
 * The list lives here rather than as a JSON schema because the *rules*
 * differ: some vars are required only in production, some are required
 * only when another var is present (e.g. AWS_S3_ENDPOINT implies R2 →
 * everything else gets validated by the upload service at runtime).
 */

type EnvCheck = {
  name: string
  /** Why this var matters — printed in the missing-var error message. */
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

/** Vars that are recommended but not fatal — printed as a warning on startup. */
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

  // FRONTEND_URL pointing at localhost in production is almost always a deploy mistake —
  // emails and CORS would use the wrong host.
  const frontendUrl = env.FRONTEND_URL ?? ''
  if (frontendUrl.startsWith('http://localhost') || frontendUrl.startsWith('http://127.')) {
    warnings.push(
      `FRONTEND_URL points at localhost (${frontendUrl}) — emails and CORS will break in production`,
    )
  }

  return { missing, warnings }
}

/**
 * Throws when running in production with missing required vars. Prints a
 * single block listing every missing var with its purpose — easier to
 * fix-and-redeploy than chasing one var at a time.
 */
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

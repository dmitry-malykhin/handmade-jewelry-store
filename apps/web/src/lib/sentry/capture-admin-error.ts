import * as Sentry from '@sentry/nextjs'
import { ApiError } from '@/lib/api/client'

interface AdminErrorContext {
  action: string
  [key: string]: unknown
}

// 4xx = user/validation error surfaced via toast — don't count against Sentry quota.
// 5xx and non-ApiError (network, unexpected) always capture with admin context so
// on-call can trace the exact orderId/productId that broke.
export function captureAdminError(error: unknown, context: AdminErrorContext): void {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return

  Sentry.captureException(error, {
    tags: { adminAction: context.action },
    contexts: { admin: context },
  })
}

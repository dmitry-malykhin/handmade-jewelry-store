/**
 * Maps the current admin pathname (locale-stripped, as returned by
 * `usePathname` from `@/i18n/navigation`) to a `docs/admin-help/{slug}.md`.
 *
 * Order matters — more specific patterns must come before their prefixes
 * (e.g. `/admin/orders/refunds` before `/admin/orders`).
 *
 * Dynamic segments (`:id`, `:slug`) are matched with a wildcard `*`.
 */
const ADMIN_HELP_ROUTES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /^\/admin\/products\/new$/, slug: 'products/create' },
  { pattern: /^\/admin\/products\/[^/]+\/edit$/, slug: 'products/edit' },
  { pattern: /^\/admin\/products$/, slug: 'products/overview' },

  { pattern: /^\/admin\/orders\/refunds$/, slug: 'orders/refunds' },
  { pattern: /^\/admin\/orders\/production$/, slug: 'orders/production' },
  { pattern: /^\/admin\/orders\/[^/]+$/, slug: 'orders/detail' },
  { pattern: /^\/admin\/orders$/, slug: 'orders/overview' },

  { pattern: /^\/admin\/inventory$/, slug: 'products/inventory' },

  { pattern: /^\/admin\/customers\/[^/]+$/, slug: 'customers/profile' },
  { pattern: /^\/admin\/customers$/, slug: 'customers/overview' },

  { pattern: /^\/admin\/categories$/, slug: 'categories' },
  { pattern: /^\/admin\/discounts$/, slug: 'discounts/overview' },
  { pattern: /^\/admin\/reviews$/, slug: 'reviews' },
  { pattern: /^\/admin\/settings$/, slug: 'settings/general' },

  { pattern: /^\/admin$/, slug: 'getting-started' },
]

export function getHelpSlugForPath(pathname: string): string | null {
  for (const { pattern, slug } of ADMIN_HELP_ROUTES) {
    if (pattern.test(pathname)) return slug
  }
  return null
}

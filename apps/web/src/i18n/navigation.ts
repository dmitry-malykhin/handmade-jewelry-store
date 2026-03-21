/**
 * Locale-aware navigation helpers from next-intl.
 * Use these instead of next/link and next/navigation across the app.
 *
 * Link    — automatically prepends /{locale} to all hrefs
 * redirect — locale-aware redirect
 * usePathname — returns pathname without locale prefix
 * useRouter   — locale-aware router
 */
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)

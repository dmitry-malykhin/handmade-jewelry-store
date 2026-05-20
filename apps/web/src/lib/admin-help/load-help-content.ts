import { existsSync, promises as fs } from 'fs'
import path from 'path'

/**
 * Path traversal guard — the slug comes from the URL, so we sanitise every
 * segment before joining it to the filesystem path. Only lowercase letters,
 * digits and dash are allowed (matches our slug convention).
 */
const VALID_SEGMENT_PATTERN = /^[a-z0-9-]+$/

/** Locales that the admin help system actively serves. */
export const SUPPORTED_HELP_LOCALES = ['en', 'ru', 'es'] as const
export type HelpLocale = (typeof SUPPORTED_HELP_LOCALES)[number]

/** Always fall back to English when a locale-specific doc is missing. */
const FALLBACK_LOCALE: HelpLocale = 'en'

function isValidSegment(segment: string): boolean {
  return VALID_SEGMENT_PATTERN.test(segment)
}

function isHelpLocale(value: string): value is HelpLocale {
  return (SUPPORTED_HELP_LOCALES as readonly string[]).includes(value)
}

/**
 * Finds the monorepo root by walking up from the current working directory
 * looking for `pnpm-workspace.yaml`. We can't rely on `__dirname` here —
 * Next.js bundles server code into `.next/server/...`, so the source-relative
 * `__dirname` does not point at the original file. CWD is stable across
 * `pnpm dev`, `next start`, and the test runner.
 */
function findRepoRoot(startDir: string): string | null {
  let current = path.resolve(startDir)
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/**
 * Resolves the on-disk path for a localized help doc. Slug parts are joined
 * with `/` and `.md` is appended; an invalid slug or unsupported locale
 * returns `null` so the Route Handler can 404 without touching the FS.
 */
export function resolveHelpDocPath(locale: string, slugSegments: string[]): string | null {
  if (!isHelpLocale(locale)) return null
  if (slugSegments.length === 0) return null
  if (!slugSegments.every(isValidSegment)) return null

  const repoRoot = findRepoRoot(process.cwd())
  if (!repoRoot) return null

  const helpDocsRoot = path.join(repoRoot, 'docs', 'admin-help', locale)
  return path.join(helpDocsRoot, ...slugSegments) + '.md'
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Loads the help doc for a locale + slug. If the file does not exist in the
 * requested locale, falls back to English. Returns `null` only when the
 * English fallback is also missing — that's the genuine "no help article"
 * signal the drawer renders.
 */
export async function loadHelpContent(
  locale: string,
  slugSegments: string[],
): Promise<string | null> {
  const localePath = resolveHelpDocPath(locale, slugSegments)
  if (localePath) {
    const localized = await readIfExists(localePath)
    if (localized !== null) return localized
  }

  if (locale === FALLBACK_LOCALE) return null

  const fallbackPath = resolveHelpDocPath(FALLBACK_LOCALE, slugSegments)
  if (!fallbackPath) return null
  return readIfExists(fallbackPath)
}

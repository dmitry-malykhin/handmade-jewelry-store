export interface HighlightSegment {
  text: string
  isMatch: boolean
}

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

function escapeRegExp(literal: string): string {
  return literal.replace(REGEX_SPECIAL_CHARS, '\\$&')
}

/**
 * Splits `text` into highlight segments around every case-insensitive match
 * of `query`. Empty query → single non-match segment so callers don't need to
 * branch.
 *
 * Returns segments rather than HTML so the React renderer stays in control
 * of element types / dangerously-set-html — `<mark>` (or any wrapper) is
 * decided at the call site.
 */
export function highlightMatch(text: string, query: string): HighlightSegment[] {
  const trimmed = query.trim()
  if (!trimmed || !text) return [{ text, isMatch: false }]

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, 'gi')
  const parts = text.split(pattern)

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === trimmed.toLowerCase(),
    }))
}

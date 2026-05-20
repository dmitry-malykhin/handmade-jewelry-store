/**
 * Minimal RFC 4180 CSV writer.
 *
 * We don't pull a library because the surface area we need is tiny: escape
 * commas / quotes / newlines, render a header row, render data rows. A 30-line
 * util has no maintenance cost and lets us keep the bundle clean.
 *
 * Excel / Numbers / Google Sheets all accept this format when served as
 * `text/csv; charset=utf-8` with a UTF-8 BOM (added by the caller — Excel on
 * Windows requires it for non-ASCII to render).
 */

/** Escape a single cell value according to RFC 4180. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const stringValue = typeof value === 'string' ? value : String(value)
  // Quote when the value contains a comma, double-quote, CR or LF.
  const needsQuoting = /[",\r\n]/.test(stringValue)
  if (!needsQuoting) return stringValue
  const escapedQuotes = stringValue.replace(/"/g, '""')
  return `"${escapedQuotes}"`
}

/** Build a single CSV row from cell values (no trailing newline). */
export function buildCsvRow(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(',')
}

/**
 * Build a complete CSV document from headers + rows. Each row gets CRLF
 * separator (RFC 4180 §2.1). The output is always non-empty: an empty `rows`
 * array still produces the header line so downloads never feel "broken".
 */
export function buildCsvDocument(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [buildCsvRow(headers), ...rows.map(buildCsvRow)]
  return lines.join('\r\n')
}

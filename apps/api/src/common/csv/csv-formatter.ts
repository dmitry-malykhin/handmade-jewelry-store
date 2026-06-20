// Minimal RFC 4180 CSV writer. Caller prepends the UTF-8 BOM if Excel on
// Windows must render non-ASCII.

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const stringValue = typeof value === 'string' ? value : String(value)
  const needsQuoting = /[",\r\n]/.test(stringValue)
  if (!needsQuoting) return stringValue
  const escapedQuotes = stringValue.replace(/"/g, '""')
  return `"${escapedQuotes}"`
}

export function buildCsvRow(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(',')
}

// Empty `rows` still yields the header line so downloads aren't "broken".
export function buildCsvDocument(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [buildCsvRow(headers), ...rows.map(buildCsvRow)]
  return lines.join('\r\n')
}

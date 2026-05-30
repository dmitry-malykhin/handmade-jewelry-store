import { buildCsvDocument, buildCsvRow, escapeCsvCell } from '../csv-formatter'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/common')
  await $allureSubSuite('csv-formatter')
  await $allureSeverity('normal')
})

describe('escapeCsvCell', () => {
  it('returns plain values untouched', () => {
    expect(escapeCsvCell('hello')).toBe('hello')
    expect(escapeCsvCell(42)).toBe('42')
    expect(escapeCsvCell(0)).toBe('0')
  })

  it('returns an empty string for null and undefined', () => {
    // Treating both as empty matches what spreadsheet apps expect for a blank cell.
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('wraps values containing a comma in double quotes', () => {
    expect(escapeCsvCell('Smith, John')).toBe('"Smith, John"')
  })

  it('doubles up embedded double quotes and wraps the cell', () => {
    expect(escapeCsvCell('She said "hi"')).toBe('"She said ""hi"""')
  })

  it('wraps values containing newlines (multi-line addresses)', () => {
    expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
    expect(escapeCsvCell('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"')
  })
})

describe('buildCsvRow', () => {
  it('joins escaped cells with commas', () => {
    expect(buildCsvRow(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('handles mixed types and escaping in one row', () => {
    expect(buildCsvRow(['order-1', 42, 'Smith, John', null, undefined])).toBe(
      'order-1,42,"Smith, John",,',
    )
  })
})

describe('buildCsvDocument', () => {
  it('renders headers as the first line with CRLF separators', () => {
    const csv = buildCsvDocument(
      ['id', 'name'],
      [
        ['1', 'Ada'],
        ['2', 'Bob'],
      ],
    )
    expect(csv).toBe('id,name\r\n1,Ada\r\n2,Bob')
  })

  it('returns just the header when there are no data rows', () => {
    // Empty exports should still feel useful — the user sees their column
    // layout instead of a 0-byte file.
    expect(buildCsvDocument(['id', 'name'], [])).toBe('id,name')
  })

  it('escapes every column the same way the row builder does', () => {
    const csv = buildCsvDocument(['email', 'note'], [['a@b.com', 'Has, comma']])
    expect(csv).toBe('email,note\r\na@b.com,"Has, comma"')
  })
})

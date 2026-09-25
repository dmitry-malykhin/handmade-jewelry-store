import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@/test-utils'
import { CookieDisclosureTable } from '../cookie-disclosure-table'
import { getCookiesByCategory } from '@/lib/legal/cookie-registry'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('cookie-disclosure-table')
  await $allureSeverity('critical')
})

describe('CookieDisclosureTable', () => {
  it('renders the five EDPB-required columns for a category', () => {
    render(<CookieDisclosureTable category="analytics" />)

    const table = screen.getByRole('table')
    expect(within(table).getByText(/^Name$/i)).toBeInTheDocument()
    expect(within(table).getByText(/^Provider$/i)).toBeInTheDocument()
    expect(within(table).getByText(/^Purpose$/i)).toBeInTheDocument()
    expect(within(table).getByText(/^Duration$/i)).toBeInTheDocument()
    expect(within(table).getByText(/^Data transfer$/i)).toBeInTheDocument()
  })

  it('renders one row per registry entry in the analytics category', () => {
    render(<CookieDisclosureTable category="analytics" />)
    const analyticsEntries = getCookiesByCategory('analytics')

    for (const cookie of analyticsEntries) {
      expect(screen.getByText(cookie.name)).toBeInTheDocument()
      expect(screen.getByText(cookie.provider)).toBeInTheDocument()
    }
  })

  it('does not render marketing cookies inside the analytics table', () => {
    render(<CookieDisclosureTable category="analytics" />)
    const marketingEntries = getCookiesByCategory('marketing')

    for (const cookie of marketingEntries) {
      expect(screen.queryByText(cookie.name)).not.toBeInTheDocument()
    }
  })
})

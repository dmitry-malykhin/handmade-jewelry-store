import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import LocaleError from '../error'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('error')
  await $allureSeverity('normal')
})

// After #280 the catalog moved to /, so the root [locale]/error.tsx boundary
// catches both catalog errors and any other page error under [locale]/.
describe('LocaleError boundary (root /[locale]/error.tsx)', () => {
  it('renders generic error heading', () => {
    render(<LocaleError reset={vi.fn()} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders the generic page-level error description', () => {
    render(<LocaleError reset={vi.fn()} />)
    expect(screen.getByText('Something went wrong while loading this page.')).toBeInTheDocument()
  })

  it('renders retry button that calls reset', async () => {
    const { userEvent: user } = await import('@testing-library/user-event').then((m) => ({
      userEvent: m.default,
    }))
    const handleReset = vi.fn()
    render(<LocaleError reset={handleReset} />)

    await user.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(handleReset).toHaveBeenCalledOnce()
  })

  it('renders home link', () => {
    render(<LocaleError reset={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument()
  })
})

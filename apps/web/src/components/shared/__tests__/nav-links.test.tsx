import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { NavLinks } from '../nav-links'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('nav-links')
  await $allureSeverity('normal')
})

describe('NavLinks', () => {
  it('renders the three top-level links with their hrefs', () => {
    render(<NavLinks />)

    const links = screen.getAllByRole('link')
    const hrefs = links.map((link) => link.getAttribute('href'))

    expect(hrefs).toEqual(['/', '/about', '/contact'])
  })

  it('wraps the menu in a <nav> with an accessible label', () => {
    render(<NavLinks />)

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })
})

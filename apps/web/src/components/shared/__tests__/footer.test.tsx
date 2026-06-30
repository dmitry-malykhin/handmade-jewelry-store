import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { Footer } from '../footer'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/shared/cookie-preferences-button', () => ({
  CookiePreferencesButton: () => <button type="button">Cookie preferences</button>,
}))

vi.mock('@/components/features/newsletter/newsletter-form', () => ({
  NewsletterForm: () => <form aria-label="Newsletter signup" />,
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('footer')
  await $allureSeverity('normal')
})

describe('Footer', () => {
  it('renders the newsletter section with the embedded NewsletterForm', () => {
    render(<Footer />)

    expect(screen.getByRole('form', { name: /newsletter signup/i })).toBeInTheDocument()
  })

  it('renders three navigation groups (shop / company / support)', () => {
    render(<Footer />)

    const navs = screen.getAllByRole('navigation')
    expect(navs.length).toBeGreaterThanOrEqual(3)
  })

  it('renders the privacy + terms links', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms')
  })

  it('renders the current year in the copyright line', () => {
    render(<Footer />)

    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument()
  })

  it('renders the cookie preferences button', () => {
    render(<Footer />)

    expect(screen.getByRole('button', { name: /cookie preferences/i })).toBeInTheDocument()
  })
})

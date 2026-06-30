import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { Header } from '../header'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../mobile-nav', () => ({ MobileNav: () => <div data-testid="mobile-nav" /> }))
vi.mock('../currency-switcher', () => ({
  CurrencySwitcher: () => <div data-testid="currency-switcher" />,
}))
vi.mock('../language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}))
vi.mock('../theme-toggle', () => ({ ThemeToggle: () => <div data-testid="theme-toggle" /> }))
vi.mock('../cart-icon-button', () => ({ CartIconButton: () => <div data-testid="cart-icon" /> }))
vi.mock('../account-icon-button', () => ({
  AccountIconButton: () => <div data-testid="account-icon" />,
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('header')
  await $allureSeverity('normal')
})

describe('Header', () => {
  it('renders the logo as a link to the catalog home', () => {
    render(<Header />)

    const logoLink = screen.getByRole('link', { name: /senichka.*home/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('renders the search link pointing to /search', () => {
    render(<Header />)

    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search')
  })

  it('renders nav links, account, cart, theme, currency, language and mobile nav slots', () => {
    render(<Header />)

    expect(screen.getByTestId('account-icon')).toBeInTheDocument()
    expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('currency-switcher')).toBeInTheDocument()
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
  })

  it('uses semantic <header> as the top-level container', () => {
    render(<Header />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

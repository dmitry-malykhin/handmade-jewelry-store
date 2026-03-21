import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { MobileNav } from '@/components/shared/mobile-nav'

const mockReplace = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => '/',
  Link: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
    className?: string
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}))

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useLocale: () => 'en',
  }
})

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: 'light', setTheme: vi.fn() })),
}))

beforeEach(() => {
  mockReplace.mockClear()
})

describe('MobileNav', () => {
  // ── Hamburger button ───────────────────────────────────────────────────────

  it('renders the hamburger toggle button', () => {
    render(<MobileNav />)
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('sets aria-expanded="false" on the toggle when menu is closed', () => {
    render(<MobileNav />)
    const toggleButton = screen.getByRole('button', { name: /open menu/i })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
  })

  // ── Open / Close ───────────────────────────────────────────────────────────

  it('opens the menu when hamburger is clicked', async () => {
    render(<MobileNav />)
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('closes the menu when hamburger is clicked again', async () => {
    render(<MobileNav />)

    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))
    await userEvent.click(screen.getByRole('button', { name: /close menu/i }))

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  // ── Navigation links ───────────────────────────────────────────────────────

  it('renders all main navigation links inside the sidebar', async () => {
    render(<MobileNav />)
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))

    const navigation = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(navigation).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /shop/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /collections/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
  })

  // ── Language accordion ─────────────────────────────────────────────────────

  it('shows the language accordion trigger with current locale', async () => {
    render(<MobileNav />)
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))

    // After the menu opens (hamburger is aria-expanded="true"), the accordion trigger
    // is the only button left with aria-expanded="false" — use that to find it uniquely.
    // (getByText('🇺🇸') would fail because the flag also appears in the hidden panel)
    const accordionTrigger = screen.getByRole('button', { expanded: false })
    expect(accordionTrigger).toBeInTheDocument()
    expect(accordionTrigger).toHaveTextContent('English')
  })

  it('expands the language accordion when triggered', async () => {
    render(<MobileNav />)
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))

    // Accordion trigger is the only button with aria-expanded="false" once the menu is open
    const accordionTrigger = screen.getByRole('button', { expanded: false })
    await userEvent.click(accordionTrigger)

    // After clicking, the trigger becomes aria-expanded="true"
    expect(accordionTrigger).toHaveAttribute('aria-expanded', 'true')
    // Locale option buttons are now accessible (aria-expanded doesn't affect DOM presence in jsdom)
    expect(screen.getByRole('button', { name: /русский/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /español/i })).toBeInTheDocument()
  })

  it('closes the menu after selecting a nav link', async () => {
    render(<MobileNav />)
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))
    await userEvent.click(screen.getByRole('link', { name: /shop/i }))

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})

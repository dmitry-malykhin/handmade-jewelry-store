import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { LanguageSwitcher } from '@/components/shared/language-switcher'

const mockReplace = vi.fn()

// Mock locale-aware navigation — uses next/navigation internally
// which doesn't work outside the Next.js runtime
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => '/',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next-intl's useLocale — the provider in test-utils gives messages
// but useLocale needs to return a specific value for the current locale display
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useLocale: () => 'en',
  }
})

beforeEach(() => {
  mockReplace.mockClear()
})

describe('LanguageSwitcher', () => {
  it('renders the current locale flag and short code', () => {
    render(<LanguageSwitcher />)
    // English locale: flag 🇺🇸 and short code "EN"
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('has accessible trigger with aria-label describing the current language', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByLabelText(/language.*english/i)).toBeInTheDocument()
  })

  it('opens the dropdown and shows all 3 locale options', async () => {
    render(<LanguageSwitcher />)

    await userEvent.click(screen.getByLabelText(/language/i))

    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Русский')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('calls router.replace with the selected locale when switching language', async () => {
    render(<LanguageSwitcher />)

    await userEvent.click(screen.getByLabelText(/language/i))
    await userEvent.click(screen.getByText('Русский'))

    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/', { locale: 'ru' })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useCookieConsentStore } from '@/store/cookie-consent.store'
import { CookieBanner } from '../cookie-banner'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Switch renders as a button with role="switch" — shadcn uses Radix under the hood
vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    id,
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    id: string
    checked: boolean
    onCheckedChange: (value: boolean) => void
    'aria-label'?: string
  }) => (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      type="button"
    />
  ),
}))

function resetStore() {
  useCookieConsentStore.setState({
    hasDecided: false,
    preferences: { analytics: false, marketing: false },
  })
}

function suppressPersistRehydrate() {
  // persist.rehydrate() is called on mount — stub it to prevent test noise
  vi.spyOn(useCookieConsentStore.persist, 'rehydrate').mockImplementation(() => Promise.resolve())
}

describe('CookieBanner — visibility', () => {
  beforeEach(() => {
    resetStore()
    suppressPersistRehydrate()
  })

  it('renders the banner when the user has not yet decided', () => {
    render(<CookieBanner />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('hides the banner after acceptAll is called', () => {
    useCookieConsentStore.setState({ hasDecided: true })
    render(<CookieBanner />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('hides the banner after rejectAll is called', () => {
    useCookieConsentStore.setState({ hasDecided: true })
    render(<CookieBanner />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('CookieBanner — default view actions', () => {
  beforeEach(() => {
    resetStore()
    suppressPersistRehydrate()
  })

  it('renders title, description, and all three action buttons', () => {
    render(<CookieBanner />)
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'acceptAll' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'rejectAll' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'customise' })).toBeInTheDocument()
  })

  it('renders a Privacy Policy link', () => {
    render(<CookieBanner />)
    const privacyLink = screen.getByRole('link', { name: 'learnMore' })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('calls acceptAll on the store when "Accept all" is clicked', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'acceptAll' }))
    expect(useCookieConsentStore.getState().hasDecided).toBe(true)
    expect(useCookieConsentStore.getState().preferences.analytics).toBe(true)
    expect(useCookieConsentStore.getState().preferences.marketing).toBe(true)
  })

  it('calls rejectAll on the store when "Reject optional" is clicked', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'rejectAll' }))
    expect(useCookieConsentStore.getState().hasDecided).toBe(true)
    expect(useCookieConsentStore.getState().preferences.analytics).toBe(false)
    expect(useCookieConsentStore.getState().preferences.marketing).toBe(false)
  })
})

describe('CookieBanner — customise panel', () => {
  beforeEach(() => {
    resetStore()
    suppressPersistRehydrate()
  })

  it('shows the customise panel when "Customise" is clicked', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    expect(screen.getByText('necessaryLabel')).toBeInTheDocument()
    expect(screen.getByText('analyticsLabel')).toBeInTheDocument()
    expect(screen.getByText('marketingLabel')).toBeInTheDocument()
  })

  it('shows analytics and marketing toggles in the customise panel', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    expect(screen.getByRole('switch', { name: 'analyticsLabel' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'marketingLabel' })).toBeInTheDocument()
  })

  it('analytics toggle starts unchecked when preferences are false', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    const analyticsToggle = screen.getByRole('switch', { name: 'analyticsLabel' })
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking the analytics toggle changes its checked state', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    const analyticsToggle = screen.getByRole('switch', { name: 'analyticsLabel' })
    fireEvent.click(analyticsToggle)
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('saves custom preferences to the store when "Save preferences" is clicked', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))

    // Enable analytics only
    fireEvent.click(screen.getByRole('switch', { name: 'analyticsLabel' }))

    fireEvent.click(screen.getByRole('button', { name: 'savePreferences' }))

    const { hasDecided, preferences } = useCookieConsentStore.getState()
    expect(hasDecided).toBe(true)
    expect(preferences.analytics).toBe(true)
    expect(preferences.marketing).toBe(false)
  })

  it('returns to the default view when "Back" is clicked without saving', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'acceptAll' })).toBeInTheDocument()
    expect(screen.queryByText('analyticsLabel')).not.toBeInTheDocument()
  })

  it('does not save preferences when Back is clicked (store remains undecided)', () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'customise' }))
    fireEvent.click(screen.getByRole('switch', { name: 'analyticsLabel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(useCookieConsentStore.getState().hasDecided).toBe(false)
  })
})

describe('CookieBanner — accessibility', () => {
  beforeEach(() => {
    resetStore()
    suppressPersistRehydrate()
  })

  it('has role="dialog" on the banner container', () => {
    render(<CookieBanner />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has aria-labelledby pointing to the title element', () => {
    render(<CookieBanner />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'cookie-banner-title')
  })

  it('has aria-describedby pointing to the description element', () => {
    render(<CookieBanner />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-describedby', 'cookie-banner-description')
  })
})

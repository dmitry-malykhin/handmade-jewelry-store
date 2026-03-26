import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { CheckoutEntry } from '../checkout-entry'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Prevent rendering the full CheckoutAddressForm after clicking "guest"
vi.mock('../checkout-address-form', () => ({
  CheckoutAddressForm: () => <div data-testid="checkout-address-form" />,
}))

describe('CheckoutEntry', () => {
  it('renders the entry screen with guest and auth options', () => {
    render(<CheckoutEntry />)

    expect(screen.getByText('entryTitle')).toBeInTheDocument()
    expect(screen.getByText('continueAsGuest')).toBeInTheDocument()
    expect(screen.getByText('signIn')).toBeInTheDocument()
  })

  it('shows the address form after clicking "Continue as Guest"', async () => {
    render(<CheckoutEntry />)

    await userEvent.click(screen.getByText('continueAsGuest'))

    expect(screen.getByTestId('checkout-address-form')).toBeInTheDocument()
  })

  it('does not show the address form on initial render', () => {
    render(<CheckoutEntry />)

    expect(screen.queryByTestId('checkout-address-form')).not.toBeInTheDocument()
  })

  it('renders Sign In as a link to /login', () => {
    render(<CheckoutEntry />)

    const signInLink = screen.getByRole('link', { name: 'signIn' })
    expect(signInLink).toHaveAttribute('href', '/login')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { CurrencySwitcher } from '../currency-switcher'
import { useCurrencyStore } from '@/store/currency.store'

// Radix DropdownMenu needs these jsdom-missing APIs
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

beforeEach(() => {
  useCurrencyStore.setState({ displayCurrency: 'USD' })
})

describe('CurrencySwitcher', () => {
  it('shows the current currency code in the trigger', () => {
    render(<CurrencySwitcher />)
    expect(screen.getByRole('button', { name: /USD/ })).toBeInTheDocument()
  })

  it('reflects the active store value when CAD is selected', () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    render(<CurrencySwitcher />)
    // aria-label includes the active currency code
    expect(screen.getByRole('button', { name: /CAD/ })).toBeInTheDocument()
  })

  it('switches the store to GBP when the GBP option is picked', async () => {
    const user = userEvent.setup()
    render(<CurrencySwitcher />)

    await user.click(screen.getByRole('button', { name: /USD/ }))
    await user.click(await screen.findByRole('menuitem', { name: /British Pound/i }))

    expect(useCurrencyStore.getState().displayCurrency).toBe('GBP')
  })

  it('shows a checkmark next to the active currency in the dropdown', async () => {
    useCurrencyStore.setState({ displayCurrency: 'CAD' })
    const user = userEvent.setup()
    render(<CurrencySwitcher />)

    await user.click(screen.getByRole('button', { name: /CAD/ }))
    const cadItem = await screen.findByRole('menuitem', { name: /Canadian Dollar/i })
    // The check icon is inside the active menu item
    expect(cadItem.querySelector('svg')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/shared/theme-toggle'

const mockSetTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}))

import { useTheme } from 'next-themes'

beforeEach(() => {
  mockSetTheme.mockClear()
})

describe('ThemeToggle — light mode', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
      theme: 'light',
      themes: ['light', 'dark'],
      systemTheme: 'light',
      forcedTheme: undefined,
    })
  })

  it('renders a button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('aria-label says "Dark mode" in light mode (matches header.switchToDark translation)', () => {
    render(<ThemeToggle />)
    // en.json: header.switchToDark = "Dark mode"
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument()
  })

  it('calls setTheme with "dark" when clicked in light mode', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
    expect(mockSetTheme).toHaveBeenCalledOnce()
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })
})

describe('ThemeToggle — dark mode', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: mockSetTheme,
      theme: 'dark',
      themes: ['light', 'dark'],
      systemTheme: 'dark',
      forcedTheme: undefined,
    })
  })

  it('aria-label says "Light mode" in dark mode (matches header.switchToLight translation)', () => {
    render(<ThemeToggle />)
    // en.json: header.switchToLight = "Light mode"
    expect(screen.getByRole('button', { name: 'Light mode' })).toBeInTheDocument()
  })

  it('calls setTheme with "light" when clicked in dark mode', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Light mode' }))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})

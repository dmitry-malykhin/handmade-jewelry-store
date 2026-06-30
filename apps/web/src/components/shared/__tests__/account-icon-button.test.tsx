import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { AccountIconButton } from '../account-icon-button'
import { useAuthStore } from '@/store/auth.store'
import { logoutUser } from '@/lib/api/auth'

vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/lib/api/auth', () => ({ logoutUser: vi.fn() }))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockLogoutUser = vi.mocked(logoutUser)

interface AuthSelectorState {
  isAuthenticated: boolean
  refreshToken: string | null
  accessToken: string | null
  clearTokens: () => void
}

function setAuthState(overrides: Partial<AuthSelectorState>): {
  clearTokens: ReturnType<typeof vi.fn>
} {
  const clearTokens = vi.fn()
  const state: AuthSelectorState = {
    isAuthenticated: false,
    refreshToken: null,
    accessToken: null,
    clearTokens,
    ...overrides,
  }
  mockUseAuthStore.mockImplementation((selector) =>
    selector(state as Parameters<typeof selector>[0]),
  )
  return { clearTokens }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('account-icon-button')
  await $allureSeverity('normal')
})

describe('AccountIconButton — unauthenticated', () => {
  it('shows Sign in + Register entries when isAuthenticated=false', async () => {
    setAuthState({ isAuthenticated: false })
    render(<AccountIconButton />)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    expect(await screen.findByRole('menuitem', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.getByRole('menuitem', { name: /register/i })).toHaveAttribute('href', '/register')
  })
})

describe('AccountIconButton — authenticated', () => {
  it('shows My account / My orders / Sign out entries', async () => {
    setAuthState({ isAuthenticated: true, refreshToken: 'rt' })
    render(<AccountIconButton />)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))

    expect(await screen.findByRole('menuitem', { name: /my account/i })).toHaveAttribute(
      'href',
      '/account',
    )
    expect(screen.getByRole('menuitem', { name: /my orders/i })).toHaveAttribute(
      'href',
      '/account/orders',
    )
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('clearTokens + best-effort logoutUser + router.push on Sign out click', async () => {
    const { clearTokens } = setAuthState({ isAuthenticated: true, refreshToken: 'rt-xyz' })
    mockLogoutUser.mockResolvedValue(undefined)
    render(<AccountIconButton />)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }))

    await waitFor(() => expect(clearTokens).toHaveBeenCalledTimes(1))
    expect(mockLogoutUser).toHaveBeenCalledWith('rt-xyz')
    expect(mockPush).toHaveBeenCalled()
  })

  it('swallows logoutUser API failure — local state is still cleared and user is navigated', async () => {
    const { clearTokens } = setAuthState({ isAuthenticated: true, refreshToken: 'rt-xyz' })
    mockLogoutUser.mockRejectedValueOnce(new Error('Network down'))
    render(<AccountIconButton />)

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }))

    await waitFor(() => expect(clearTokens).toHaveBeenCalled())
    expect(mockPush).toHaveBeenCalled()
  })
})

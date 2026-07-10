import { act, render, screen } from '@testing-library/react'
import { useAuthStore } from '@/store/auth.store'
import { AdminAuthGuard } from '../admin-auth-guard'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockRouterReplace = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

const mockUseAuthStore = vi.mocked(useAuthStore)

function mockAuthState(isAuthenticated: boolean, role: string | null) {
  mockUseAuthStore.mockImplementation((selector) => {
    const state = { isAuthenticated, role }
    return selector(state as Parameters<typeof selector>[0])
  })
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('admin-auth-guard')
  await $allureSeverity('normal')
})

describe('AdminAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user is authenticated and has ADMIN role', async () => {
    mockAuthState(true, 'ADMIN')

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('renders a viewport-height placeholder (not empty) when user is not authenticated', async () => {
    mockAuthState(false, null)

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
    // Placeholder reserves height so the footer doesn't jump on hydration (CLS fix).
    const placeholder = document.querySelector('div[aria-hidden="true"]')
    expect(placeholder).toHaveClass('min-h-screen')
  })

  it('renders the placeholder (not children) when user has USER role', async () => {
    mockAuthState(true, 'USER')

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
    expect(document.querySelector('div[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('redirects to / when user is not authenticated', async () => {
    mockAuthState(false, null)

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/')
  })

  it('redirects to / when user has USER role', async () => {
    mockAuthState(true, 'USER')

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/')
  })

  it('does not redirect when user is ADMIN', async () => {
    mockAuthState(true, 'ADMIN')

    await act(async () => {
      render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      )
    })

    expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})

import { act, render, screen } from '@testing-library/react'
import { useAuthStore } from '@/store/auth.store'
import { AdminAuthGuard } from '../admin-auth-guard'

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

  it('renders nothing when user is not authenticated', async () => {
    mockAuthState(false, null)

    let container!: HTMLElement
    await act(async () => {
      ;({ container } = render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      ))
    })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when user has USER role', async () => {
    mockAuthState(true, 'USER')

    let container!: HTMLElement
    await act(async () => {
      ;({ container } = render(
        <AdminAuthGuard>
          <div>Admin content</div>
        </AdminAuthGuard>,
      ))
    })

    expect(container).toBeEmptyDOMElement()
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

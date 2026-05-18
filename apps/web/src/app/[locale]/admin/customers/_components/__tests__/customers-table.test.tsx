import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as CustomersApiModule from '@/lib/api/customers'
import { CustomersTable } from '../customers-table'

const fetchAdminCustomersMock = vi.fn()

vi.mock('@/lib/api/customers', async () => {
  const actual = await vi.importActual<typeof CustomersApiModule>('@/lib/api/customers')
  return {
    ...actual,
    fetchAdminCustomers: (...args: unknown[]) => fetchAdminCustomersMock(...args),
  }
})

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function buildCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    createdAt: '2026-01-15T00:00:00Z',
    totalOrders: 3,
    lifetimeValueUsd: 245.5,
    lastOrderAt: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

function buildResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: [buildCustomer()],
    meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
    ...overrides,
  }
}

describe('CustomersTable', () => {
  beforeEach(() => {
    fetchAdminCustomersMock.mockReset()
  })

  it('shows empty state when no customers match the filters', async () => {
    fetchAdminCustomersMock.mockResolvedValueOnce(
      buildResponse({ data: [], meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 } }),
    )

    render(<CustomersTable />)

    await waitFor(() =>
      expect(screen.getByText(/No customers match this search/i)).toBeInTheDocument(),
    )
  })

  it('renders customer row with email, joined date, orders count, lifetime value', async () => {
    fetchAdminCustomersMock.mockResolvedValueOnce(buildResponse())

    render(<CustomersTable />)

    await waitFor(() => expect(screen.getByText('jane@example.com')).toBeInTheDocument())
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('$245.50')).toBeInTheDocument()
  })

  it('links email to /admin/customers/[id]', async () => {
    fetchAdminCustomersMock.mockResolvedValueOnce(buildResponse())

    render(<CustomersTable />)

    await waitFor(() => expect(screen.getByText('jane@example.com')).toBeInTheDocument())
    const link = screen.getByText('jane@example.com').closest('a')
    expect(link).toHaveAttribute('href', expect.stringContaining('user-1'))
  })

  it('debounces search input and refetches with the search param', async () => {
    fetchAdminCustomersMock.mockResolvedValue(
      buildResponse({ data: [], meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 } }),
    )

    render(<CustomersTable />)

    await waitFor(() => expect(fetchAdminCustomersMock).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByPlaceholderText(/Search by email/i), 'jane')

    await waitFor(
      () =>
        expect(fetchAdminCustomersMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'jane', page: 1 }),
          'test-token',
        ),
      { timeout: 1500 },
    )
  })

  it('shows pagination controls and advances page on Next', async () => {
    fetchAdminCustomersMock.mockResolvedValue(
      buildResponse({
        meta: { totalCount: 50, page: 1, limit: 20, totalPages: 3 },
      }),
    )

    render(<CustomersTable />)

    await waitFor(() => expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Next/i }))

    await waitFor(() =>
      expect(fetchAdminCustomersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        'test-token',
      ),
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import type * as CustomersApiModule from '@/lib/api/customers'
import { CustomerDetail } from '../customer-detail'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const fetchAdminCustomerByIdMock = vi.fn()

vi.mock('@/lib/api/customers', async () => {
  const actual = await vi.importActual<typeof CustomersApiModule>('@/lib/api/customers')
  return {
    ...actual,
    fetchAdminCustomerById: (...args: unknown[]) => fetchAdminCustomerByIdMock(...args),
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
    role: 'USER' as const,
    createdAt: '2026-01-15T00:00:00Z',
    totalOrders: 2,
    lifetimeValueUsd: 245.5,
    orders: [
      {
        id: 'order_abcdef1234567890',
        status: 'DELIVERED' as const,
        total: 100,
        subtotal: 95,
        shippingCost: 5,
        createdAt: '2026-04-01T00:00:00Z',
        items: [],
      },
    ],
    addresses: [
      {
        id: 'addr-1',
        fullName: 'Jane Doe',
        addressLine1: '123 Main St',
        city: 'NYC',
        postalCode: '10001',
        country: 'US',
        isDefault: true,
      },
    ],
    ...overrides,
  }
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('customer-detail')
  await $allureSeverity('normal')
})

describe('CustomerDetail', () => {
  beforeEach(() => {
    fetchAdminCustomerByIdMock.mockReset()
  })

  it('renders profile card with email, joined date, total orders, lifetime value', async () => {
    fetchAdminCustomerByIdMock.mockResolvedValueOnce(buildCustomer())

    render(<CustomerDetail userId="user-1" />)

    await waitFor(() => expect(screen.getByText('jane@example.com')).toBeInTheDocument())
    expect(screen.getByText('$245.50')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders order history rows linking back to /admin/orders/[id]', async () => {
    fetchAdminCustomerByIdMock.mockResolvedValueOnce(buildCustomer())

    render(<CustomerDetail userId="user-1" />)

    await waitFor(() => expect(screen.getByText(/34567890/)).toBeInTheDocument())
    const orderLink = screen.getByText(/34567890/).closest('a')
    expect(orderLink).toHaveAttribute('href', expect.stringContaining('order_abcdef1234567890'))
  })

  it('renders empty state when customer has no orders', async () => {
    fetchAdminCustomerByIdMock.mockResolvedValueOnce(buildCustomer({ orders: [] }))

    render(<CustomerDetail userId="user-1" />)

    await waitFor(() => expect(screen.getByText(/No orders yet/i)).toBeInTheDocument())
  })

  it('renders saved addresses with Default badge for the default address', async () => {
    fetchAdminCustomerByIdMock.mockResolvedValueOnce(buildCustomer())

    render(<CustomerDetail userId="user-1" />)

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText(/Default/i)).toBeInTheDocument()
  })

  it('renders empty state when customer has no addresses', async () => {
    fetchAdminCustomerByIdMock.mockResolvedValueOnce(buildCustomer({ addresses: [] }))

    render(<CustomerDetail userId="user-1" />)

    await waitFor(() => expect(screen.getByText(/No saved addresses/i)).toBeInTheDocument())
  })
})

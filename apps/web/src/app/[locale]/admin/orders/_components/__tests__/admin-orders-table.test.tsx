import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AdminOrdersTable } from '../admin-orders-table'
import { downloadAdminOrdersCsv, fetchAdminOrders, updateAdminOrderStatus } from '@/lib/api/orders'
import { useAuthStore } from '@/store/auth.store'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// jsdom does not implement Pointer Events or scrollIntoView — required by Radix UI Select
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/api/orders', () => ({
  fetchAdminOrders: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
  downloadAdminOrdersCsv: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockFetchAdminOrders = vi.mocked(fetchAdminOrders)
const mockUpdateAdminOrderStatus = vi.mocked(updateAdminOrderStatus)
const mockDownloadAdminOrdersCsv = vi.mocked(downloadAdminOrdersCsv)
const mockUseAuthStore = vi.mocked(useAuthStore)

const sampleShippingAddress = {
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  postalCode: '10001',
  country: 'US',
}

const sampleOrder = {
  id: 'order-00000001',
  status: 'PENDING',
  guestEmail: 'buyer@example.com',
  subtotal: 6800,
  shippingCost: 500,
  total: 7300,
  shippingAddress: sampleShippingAddress,
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 1,
      price: 6800,
      productSnapshot: { title: 'Silver Ring', slug: 'silver-ring' },
    },
  ],
  createdAt: new Date('2026-01-15').toISOString(),
}

const singlePageResponse = {
  data: [sampleOrder],
  meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
}

const emptyResponse = {
  data: [],
  meta: { totalCount: 0, page: 1, limit: 20, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector) =>
    selector({ accessToken: 'mock-token' } as Parameters<typeof selector>[0]),
  )
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('admin-orders-table')
  await $allureSeverity('normal')
})

describe('AdminOrdersTable — rendering', () => {
  it('renders the table heading', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    expect(await screen.findByRole('heading', { name: /orders/i })).toBeInTheDocument()
  })

  it('renders order row with last 8 chars of id', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    expect(await screen.findByText('00000001')).toBeInTheDocument()
  })

  it('renders guest email in customer column', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    expect(await screen.findByText('buyer@example.com')).toBeInTheDocument()
  })

  it('renders "Guest" label when guestEmail is null', async () => {
    mockFetchAdminOrders.mockResolvedValue({
      ...singlePageResponse,
      data: [{ ...sampleOrder, guestEmail: null }],
    })

    render(<AdminOrdersTable />)

    expect(await screen.findByText('Guest')).toBeInTheDocument()
  })

  it('renders formatted total price', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    // total 7300 cents → $7300.00
    expect(await screen.findByText('$7300.00')).toBeInTheDocument()
  })

  it('shows empty state message when no orders returned', async () => {
    mockFetchAdminOrders.mockResolvedValue(emptyResponse)

    render(<AdminOrdersTable />)

    expect(await screen.findByText('No orders found.')).toBeInTheDocument()
  })

  it('hides pagination when only one page', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    await screen.findByText('00000001')

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('shows pagination buttons when multiple pages exist', async () => {
    mockFetchAdminOrders.mockResolvedValue({
      ...singlePageResponse,
      meta: { totalCount: 25, page: 1, limit: 20, totalPages: 2 },
    })

    render(<AdminOrdersTable />)

    expect(await screen.findByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })
})

describe('AdminOrdersTable — status transitions', () => {
  it('shows clickable status button for PENDING order (has allowed transitions)', async () => {
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    // PENDING has transitions → rendered as a button trigger
    const statusButton = await screen.findByRole('button', {
      name: /change status for order 00000001/i,
    })
    expect(statusButton).toBeInTheDocument()
  })

  it('shows static badge for REFUNDED order (terminal state — no transitions)', async () => {
    const refundedOrder = { ...sampleOrder, status: 'REFUNDED' }
    mockFetchAdminOrders.mockResolvedValue({
      ...singlePageResponse,
      data: [refundedOrder],
    })

    render(<AdminOrdersTable />)

    await screen.findByText('REFUNDED')

    // No dropdown trigger button for terminal state
    expect(
      screen.queryByRole('button', { name: /change status for order/i }),
    ).not.toBeInTheDocument()
  })

  it('calls updateAdminOrderStatus immediately for silent transitions (PENDING → PAID)', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)
    mockUpdateAdminOrderStatus.mockResolvedValue({ ...sampleOrder, status: 'PAID' } as never)

    render(<AdminOrdersTable />)

    const statusButton = await screen.findByRole('button', {
      name: /change status for order 00000001/i,
    })
    await user.click(statusButton)

    const paidOption = await screen.findByRole('menuitem', { name: /paid/i })
    await user.click(paidOption)

    // PENDING → PAID has no customer side effects, so it must not gate on a dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockUpdateAdminOrderStatus).toHaveBeenCalledWith(
        'order-00000001',
        { status: 'PAID' },
        'mock-token',
      )
    })
  })

  it('opens ConfirmDialog before CANCELLED — destructive transition (#267)', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)

    render(<AdminOrdersTable />)

    const statusButton = await screen.findByRole('button', {
      name: /change status for order 00000001/i,
    })
    await user.click(statusButton)
    await user.click(await screen.findByRole('menuitem', { name: /cancelled/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(mockUpdateAdminOrderStatus).not.toHaveBeenCalled()
  })

  it('dialog confirm for CANCELLED triggers the API call', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(singlePageResponse)
    mockUpdateAdminOrderStatus.mockResolvedValue({ ...sampleOrder, status: 'CANCELLED' } as never)

    render(<AdminOrdersTable />)

    const statusButton = await screen.findByRole('button', {
      name: /change status for order 00000001/i,
    })
    await user.click(statusButton)
    await user.click(await screen.findByRole('menuitem', { name: /cancelled/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /cancel order/i }))

    await waitFor(() => {
      expect(mockUpdateAdminOrderStatus).toHaveBeenCalledWith(
        'order-00000001',
        { status: 'CANCELLED' },
        'mock-token',
      )
    })
  })
})

describe('AdminOrdersTable — status filter', () => {
  it('passes status filter to fetchAdminOrders when selected', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(emptyResponse)

    render(<AdminOrdersTable />)

    const filterTrigger = await screen.findByRole('combobox', {
      name: /filter by status/i,
    })
    await user.click(filterTrigger)

    const shippedOption = await screen.findByRole('option', { name: /shipped/i })
    await user.click(shippedOption)

    await waitFor(() => {
      expect(mockFetchAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SHIPPED' }),
        'mock-token',
      )
    })
  })
})

describe('AdminOrdersTable — Export CSV', () => {
  it('renders the Export CSV button', async () => {
    mockFetchAdminOrders.mockResolvedValue(emptyResponse)
    render(<AdminOrdersTable />)
    expect(await screen.findByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('calls downloadAdminOrdersCsv with empty filters by default', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(emptyResponse)
    mockDownloadAdminOrdersCsv.mockResolvedValue(undefined)

    render(<AdminOrdersTable />)

    const exportButton = await screen.findByRole('button', { name: /export csv/i })
    await user.click(exportButton)

    expect(mockDownloadAdminOrdersCsv).toHaveBeenCalledWith({}, 'mock-token')
  })

  it('forwards the active status filter to the export call', async () => {
    const user = userEvent.setup()
    mockFetchAdminOrders.mockResolvedValue(emptyResponse)
    mockDownloadAdminOrdersCsv.mockResolvedValue(undefined)

    render(<AdminOrdersTable />)

    const filterTrigger = await screen.findByRole('combobox', {
      name: /filter by status/i,
    })
    await user.click(filterTrigger)
    await user.click(await screen.findByRole('option', { name: /shipped/i }))

    await user.click(await screen.findByRole('button', { name: /export csv/i }))

    expect(mockDownloadAdminOrdersCsv).toHaveBeenCalledWith({ status: 'SHIPPED' }, 'mock-token')
  })
})

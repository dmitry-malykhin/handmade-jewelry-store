import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AdminProductsTable } from '../admin-products-table'
import {
  bulkUpdateAdminProducts,
  fetchAdminProducts,
  updateProductStatus,
  deleteAdminProduct,
} from '@/lib/api/products'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Radix UI components inside the table need these jsdom-missing APIs
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/api/products', () => ({
  fetchAdminProducts: vi.fn(),
  updateProductStatus: vi.fn(),
  deleteAdminProduct: vi.fn(),
  bulkUpdateAdminProducts: vi.fn(),
  downloadAdminProductsCsv: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn((selector) => selector({ accessToken: 'mock-token' })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockFetchAdminProducts = vi.mocked(fetchAdminProducts)
const mockBulkUpdateAdminProducts = vi.mocked(bulkUpdateAdminProducts)
const mockUpdateProductStatus = vi.mocked(updateProductStatus)
const mockDeleteAdminProduct = vi.mocked(deleteAdminProduct)

const sampleProductA = {
  id: 'prod-a',
  slug: 'ring-a',
  title: 'Ring A',
  description: 'desc',
  price: 50,
  stock: 1,
  images: [],
  sku: 'SKU-A',
  weight: null,
  material: null,
  avgRating: 0,
  reviewCount: 0,
  status: 'ACTIVE',
  stockType: 'IN_STOCK',
  productionDays: 0,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  diameterCm: null,
  weightGrams: null,
  beadSizeMm: null,
  categoryId: 'cat-1',
  createdAt: '2026-05-19T00:00:00Z',
  updatedAt: '2026-05-19T00:00:00Z',
}

const sampleProductB = {
  ...sampleProductA,
  id: 'prod-b',
  slug: 'ring-b',
  title: 'Ring B',
  status: 'DRAFT',
}

const twoProducts = {
  data: [sampleProductA, sampleProductB],
  meta: { totalCount: 2, page: 1, limit: 20, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchAdminProducts.mockResolvedValue(twoProducts as never)
  void mockUpdateProductStatus
  void mockDeleteAdminProduct
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('admin-products-table')
  await $allureSeverity('normal')
})

describe('AdminProductsTable — bulk selection', () => {
  it('renders a row checkbox per product plus the select-all header checkbox', async () => {
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    // 1 header checkbox + 2 row checkboxes.
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('shows the bulk action bar with selected count after picking a row', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    const rowCheckbox = screen.getByRole('checkbox', { name: /select ring a/i })
    await user.click(rowCheckbox)

    expect(screen.getByRole('region', { name: /1 product selected/i })).toBeInTheDocument()
  })

  it('select-all toggles every product on the current page', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    const selectAll = screen.getByRole('checkbox', { name: /select all products/i })
    await user.click(selectAll)

    expect(screen.getByRole('region', { name: /2 products selected/i })).toBeInTheDocument()
  })

  it('un-selecting one row drops the count back to 1', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select all products/i }))
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))

    expect(screen.getByRole('region', { name: /1 product selected/i })).toBeInTheDocument()
  })

  it('Clear selection button removes the action bar entirely', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))
    await user.click(screen.getByRole('button', { name: /clear selection/i }))

    expect(screen.queryByRole('region', { name: /product selected/i })).not.toBeInTheDocument()
  })
})

describe('AdminProductsTable — bulk actions', () => {
  it('Publish opens confirmation dialog without calling the API yet (#267)', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))
    await user.click(screen.getByRole('button', { name: /^publish$/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(mockBulkUpdateAdminProducts).not.toHaveBeenCalled()
  })

  it('Publish confirmation triggers the bulk API call', async () => {
    const user = userEvent.setup()
    mockBulkUpdateAdminProducts.mockResolvedValueOnce({ affectedCount: 1 })

    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))
    await user.click(screen.getByRole('button', { name: /^publish$/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^publish$/i }))

    await waitFor(() => {
      expect(mockBulkUpdateAdminProducts).toHaveBeenCalledWith(
        { ids: ['prod-a'], action: 'publish' },
        'mock-token',
      )
    })
  })

  it('Move to draft confirmation triggers the bulk API call', async () => {
    const user = userEvent.setup()
    mockBulkUpdateAdminProducts.mockResolvedValueOnce({ affectedCount: 2 })

    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select all products/i }))
    await user.click(screen.getByRole('button', { name: /move to draft/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /move to draft/i }))

    await waitFor(() => {
      expect(mockBulkUpdateAdminProducts).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'draft' }),
        'mock-token',
      )
    })
  })

  it('Delete opens confirmation dialog without calling the API yet', async () => {
    const user = userEvent.setup()
    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/permanently removes/i)).toBeInTheDocument()
    expect(mockBulkUpdateAdminProducts).not.toHaveBeenCalled()
  })

  it('Delete confirmation triggers bulk delete', async () => {
    const user = userEvent.setup()
    mockBulkUpdateAdminProducts.mockResolvedValueOnce({ affectedCount: 1 })

    render(<AdminProductsTable />)

    await screen.findByText('Ring A')
    await user.click(screen.getByRole('checkbox', { name: /select ring a/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    const dialog = await screen.findByRole('dialog')
    const confirmButton = within(dialog).getByRole('button', { name: /^delete$/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockBulkUpdateAdminProducts).toHaveBeenCalledWith(
        { ids: ['prod-a'], action: 'delete' },
        'mock-token',
      )
    })
  })
})

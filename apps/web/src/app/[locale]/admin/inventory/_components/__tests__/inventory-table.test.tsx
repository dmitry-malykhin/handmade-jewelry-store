import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as ProductsApiModule from '@/lib/api/products'
import { InventoryTable } from '../inventory-table'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const fetchAdminInventoryMock = vi.fn()
const updateAdminProductStockMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('@/lib/api/products', async () => {
  const actual = await vi.importActual<typeof ProductsApiModule>('@/lib/api/products')
  return {
    ...actual,
    fetchAdminInventory: (...args: unknown[]) => fetchAdminInventoryMock(...args),
    updateAdminProductStock: (...args: unknown[]) => updateAdminProductStockMock(...args),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toastSuccessMock(message),
    error: (message: string) => toastErrorMock(message),
  },
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

const baseProduct = {
  id: 'prod-1',
  slug: 'silver-ring',
  title: 'Silver Ring',
  description: '',
  price: '49.99',
  stock: 2,
  stockType: 'IN_STOCK' as const,
  productionDays: 0,
  images: ['/img.jpg'],
  sku: 'RING-001',
  material: 'Silver',
  avgRating: 0,
  reviewCount: 0,
  status: 'ACTIVE',
  category: { name: 'Rings', slug: 'rings' },
  createdAt: '',
  updatedAt: '',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('inventory-table')
  await $allureSeverity('normal')
})

describe('InventoryTable', () => {
  beforeEach(() => {
    fetchAdminInventoryMock.mockReset()
    updateAdminProductStockMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('renders the empty state when no products match the filters', async () => {
    fetchAdminInventoryMock.mockResolvedValueOnce({ threshold: 3, data: [] })

    render(<InventoryTable />)

    await waitFor(() =>
      expect(screen.getByText(/No products match these filters/i)).toBeInTheDocument(),
    )
  })

  it('renders products with low-stock badge when isLowStock=true', async () => {
    fetchAdminInventoryMock.mockResolvedValueOnce({
      threshold: 3,
      data: [{ ...baseProduct, stock: 1, isLowStock: true }],
    })

    render(<InventoryTable />)

    await waitFor(() => expect(screen.getByText('Silver Ring')).toBeInTheDocument())
    // The badge appears in a TableCell; the "Low stock only" Label appears in
    // the filter card. Disambiguate by counting all matches: 2 when low stock,
    // 1 (just the filter label) when not.
    expect(screen.getAllByText(/Low stock/i)).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Edit stock for Silver Ring/i })).toHaveTextContent(
      '1',
    )
  })

  it('does not render low-stock badge for items where isLowStock=false', async () => {
    fetchAdminInventoryMock.mockResolvedValueOnce({
      threshold: 3,
      data: [{ ...baseProduct, stock: 12, isLowStock: false }],
    })

    render(<InventoryTable />)

    await waitFor(() => expect(screen.getByText('Silver Ring')).toBeInTheDocument())
    // Only the filter Label remains — no badge in the row.
    expect(screen.getAllByText(/Low stock/i)).toHaveLength(1)
  })

  it('refetches when threshold changes', async () => {
    fetchAdminInventoryMock.mockResolvedValue({ threshold: 3, data: [] })

    render(<InventoryTable />)

    await waitFor(() => expect(fetchAdminInventoryMock).toHaveBeenCalledTimes(1))
    expect(fetchAdminInventoryMock).toHaveBeenLastCalledWith(
      'test-token',
      expect.objectContaining({ threshold: 3 }),
    )

    const thresholdInput = screen.getByLabelText(/Alert me when stock/i)
    await userEvent.clear(thresholdInput)
    await userEvent.type(thresholdInput, '5')

    await waitFor(() =>
      expect(fetchAdminInventoryMock).toHaveBeenLastCalledWith(
        'test-token',
        expect.objectContaining({ threshold: 5 }),
      ),
    )
  })

  it('calls updateAdminProductStock when admin commits a stock edit', async () => {
    fetchAdminInventoryMock.mockResolvedValue({
      threshold: 3,
      data: [{ ...baseProduct, stock: 2, isLowStock: true }],
    })
    updateAdminProductStockMock.mockResolvedValueOnce({
      ...baseProduct,
      stock: 7,
    })

    render(<InventoryTable />)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Edit stock for Silver Ring/i }),
      ).toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: /Edit stock for Silver Ring/i }))

    const input = screen.getByRole('spinbutton', { name: /Edit stock for Silver Ring/i })
    await userEvent.clear(input)
    await userEvent.type(input, '7')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(updateAdminProductStockMock).toHaveBeenCalledOnce())
    expect(updateAdminProductStockMock).toHaveBeenCalledWith('prod-1', 7, 'test-token')
  })
})

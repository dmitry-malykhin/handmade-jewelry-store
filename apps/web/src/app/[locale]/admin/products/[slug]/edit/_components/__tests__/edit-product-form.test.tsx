import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test-utils'
import { EditProductForm } from '../edit-product-form'
import { updateAdminProduct } from '@/lib/api/products'
import { useAuthStore } from '@/store/auth.store'
import type { Category, Product } from '@jewelry/shared'

vi.mock('@/lib/api/products', () => ({
  updateAdminProduct: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockUpdateAdminProduct = vi.mocked(updateAdminProduct)
const mockUseAuthStore = vi.mocked(useAuthStore)

const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' },
  { id: 'cat-2', name: 'Necklaces', slug: 'necklaces' },
]

const sampleProduct: Product = {
  id: 'prod-1',
  title: 'Silver Ring',
  description: 'A beautiful handmade silver ring crafted with love.',
  price: '49.99',
  stock: 5,
  images: ['https://cdn.example.com/products/silver-ring.jpg'],
  slug: 'silver-ring',
  sku: 'SKU-100',
  weight: null,
  material: 'Sterling silver',
  avgRating: 0,
  reviewCount: 0,
  status: 'DRAFT',
  stockType: 'IN_STOCK',
  productionDays: 0,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  diameterCm: null,
  weightGrams: null,
  beadSizeMm: null,
  categoryId: 'cat-1',
  category: { name: 'Bracelets', slug: 'bracelets' },
  createdAt: '2026-03-10T00:00:00.000Z',
  updatedAt: '2026-03-10T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector) =>
    selector({ accessToken: 'mock-token' } as Parameters<typeof selector>[0]),
  )

  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('EditProductForm', () => {
  it('pre-fills inputs from API product data', () => {
    render(<EditProductForm categories={sampleCategories} product={sampleProduct} />)

    expect(screen.getByDisplayValue('Silver Ring')).toBeInTheDocument()
    expect(screen.getByDisplayValue('silver-ring')).toBeInTheDocument()
    expect(screen.getByDisplayValue('49.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SKU-100')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /preview of silver-ring\.jpg/i })).toBeInTheDocument()
  })

  it('submits updated values to updateAdminProduct', async () => {
    mockUpdateAdminProduct.mockResolvedValue({
      ...sampleProduct,
      title: 'Updated Silver Ring',
      stock: 7,
    })

    render(<EditProductForm categories={sampleCategories} product={sampleProduct} />)

    const titleInput = screen.getByPlaceholderText(/northern lights bracelet/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Updated Silver Ring')

    const stockInput = screen.getByRole('spinbutton', { name: /stock quantity/i })
    await userEvent.clear(stockInput)
    await userEvent.type(stockInput, '7')

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdateAdminProduct).toHaveBeenCalledWith(
        'silver-ring',
        expect.objectContaining({
          title: 'Updated Silver Ring',
          stock: 7,
          images: ['https://cdn.example.com/products/silver-ring.jpg'],
        }),
        'mock-token',
      )
    })
  })
})

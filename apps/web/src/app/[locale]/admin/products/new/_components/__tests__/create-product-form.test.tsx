import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { CreateProductForm } from '../create-product-form'
import { createAdminProduct } from '@/lib/api/products'
import { useAuthStore } from '@/store/auth.store'
import type { Category } from '@jewelry/shared'

vi.mock('@/lib/api/products', () => ({
  createAdminProduct: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock ProductImageUpload to isolate form logic from upload complexity
vi.mock('../../../_components/product-image-upload', () => ({
  ProductImageUpload: ({
    onImagesChange,
  }: {
    onImagesChange: (urls: string[]) => void
    errorMessage?: string
  }) => (
    <button
      type="button"
      data-testid="mock-image-upload"
      onClick={() => onImagesChange(['https://s3.amazonaws.com/products/image.jpg'])}
    >
      Add image
    </button>
  ),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockCreateAdminProduct = vi.mocked(createAdminProduct)
const mockUseAuthStore = vi.mocked(useAuthStore)

const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' },
  { id: 'cat-2', name: 'Necklaces', slug: 'necklaces' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector) =>
    selector({ accessToken: 'mock-token' } as Parameters<typeof selector>[0]),
  )
  // jsdom does not implement Pointer Events — required by Radix UI Select
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  // Ensure fake timers are always restored so they don't leak into other tests
  vi.useRealTimers()
})

describe('CreateProductForm — rendering', () => {
  it('renders all main form sections', () => {
    render(<CreateProductForm categories={sampleCategories} />)

    expect(screen.getByText('Basic information')).toBeInTheDocument()
    expect(screen.getByText('Pricing & stock')).toBeInTheDocument()
    expect(screen.getByText('Category & material')).toBeInTheDocument()
    expect(screen.getByText('Images')).toBeInTheDocument()
  })

  it('renders category options from props', async () => {
    render(<CreateProductForm categories={sampleCategories} />)

    // Open the category select — queried by aria-label on SelectTrigger
    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await userEvent.click(categoryTrigger)

    expect(await screen.findByRole('option', { name: 'Bracelets' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Necklaces' })).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(<CreateProductForm categories={sampleCategories} />)

    expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})

describe('CreateProductForm — slug auto-generation', () => {
  it('auto-generates slug from title after 400ms debounce', async () => {
    render(<CreateProductForm categories={sampleCategories} />)

    await userEvent.type(screen.getByPlaceholderText(/northern lights bracelet/i), 'Silver Ring')

    // waitFor polls until the 400ms debounce fires naturally
    await waitFor(
      () => {
        const slugInput = screen.getByRole('textbox', { name: /url slug/i })
        expect((slugInput as HTMLInputElement).value).toBe('silver-ring')
      },
      { timeout: 1500 },
    )
  })

  it('stops auto-generating slug after manual edit', async () => {
    render(<CreateProductForm categories={sampleCategories} />)

    const slugInput = screen.getByRole('textbox', { name: /url slug/i })
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, 'my-custom-slug')

    await userEvent.type(screen.getByPlaceholderText(/northern lights bracelet/i), 'Silver Ring')

    // Wait long enough for debounce to fire — slug must remain unchanged
    await waitFor(
      () => {
        expect((slugInput as HTMLInputElement).value).toBe('my-custom-slug')
      },
      { timeout: 1500 },
    )
  })
})

describe('CreateProductForm — validation', () => {
  it('shows validation errors on submit with empty required fields', async () => {
    render(<CreateProductForm categories={sampleCategories} />)

    await userEvent.click(screen.getByRole('button', { name: /create product/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })

    expect(mockCreateAdminProduct).not.toHaveBeenCalled()
  })
})

describe('CreateProductForm — submission', () => {
  it('calls createAdminProduct with correct payload on valid submit', async () => {
    mockCreateAdminProduct.mockResolvedValue({
      id: 'prod-1',
      title: 'Silver Ring',
      slug: 'silver-ring',
    } as never)

    render(<CreateProductForm categories={sampleCategories} />)

    await userEvent.type(screen.getByPlaceholderText(/northern lights bracelet/i), 'Silver Ring')

    // Wait for slug debounce to fire before filling other fields
    await waitFor(
      () => {
        const slugInput = screen.getByRole('textbox', { name: /url slug/i })
        expect((slugInput as HTMLInputElement).value).toBe('silver-ring')
      },
      { timeout: 1500 },
    )

    await userEvent.type(
      screen.getByRole('textbox', { name: /description/i }),
      'A beautiful handmade silver ring crafted with love.',
    )
    await userEvent.type(screen.getByRole('spinbutton', { name: /price \(usd\)/i }), '49.99')
    await userEvent.type(screen.getByRole('spinbutton', { name: /stock quantity/i }), '5')

    // Select category
    await userEvent.click(screen.getByRole('combobox', { name: /category/i }))
    await userEvent.click(await screen.findByRole('option', { name: 'Bracelets' }))

    // Add image via mock
    await userEvent.click(screen.getByTestId('mock-image-upload'))

    await userEvent.click(screen.getByRole('button', { name: /create product/i }))

    await waitFor(() => {
      expect(mockCreateAdminProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Silver Ring',
          slug: 'silver-ring',
          price: 49.99,
          stock: 5,
          categoryId: 'cat-1',
          images: ['https://s3.amazonaws.com/products/image.jpg'],
        }),
        'mock-token',
      )
    })
  })
})

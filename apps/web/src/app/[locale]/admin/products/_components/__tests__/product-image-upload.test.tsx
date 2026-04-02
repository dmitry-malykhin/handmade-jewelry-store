import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ProductImageUpload } from '../product-image-upload'
import { requestPresignedUrl, uploadFileToS3 } from '@/lib/api/upload'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/lib/api/upload', () => ({
  requestPresignedUrl: vi.fn(),
  uploadFileToS3: vi.fn(),
  isAllowedImageType: vi.fn((type: string) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(type),
  ),
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_IMAGES_PER_PRODUCT: 10,
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

// jsdom does not implement URL.createObjectURL
window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
window.URL.revokeObjectURL = vi.fn()

const mockRequestPresignedUrl = vi.mocked(requestPresignedUrl)
const mockUploadFileToS3 = vi.mocked(uploadFileToS3)
const mockUseAuthStore = vi.mocked(useAuthStore)

function makeImageFile(name = 'photo.jpg', type = 'image/jpeg', size = 1024) {
  return new File(['x'.repeat(size)], name, { type })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector) =>
    selector({ accessToken: 'mock-token' } as Parameters<typeof selector>[0]),
  )
  mockRequestPresignedUrl.mockResolvedValue({
    uploadUrl: 'https://s3.amazonaws.com/bucket/products/uuid.jpg?signed',
    publicUrl: 'https://s3.amazonaws.com/bucket/products/uuid.jpg',
  })
  mockUploadFileToS3.mockResolvedValue(undefined)
})

describe('ProductImageUpload — rendering', () => {
  it('renders the dropzone', () => {
    render(<ProductImageUpload onImagesChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /upload product images/i })).toBeInTheDocument()
  })

  it('renders validation error message when provided', () => {
    render(
      <ProductImageUpload onImagesChange={vi.fn()} errorMessage="At least one image is required" />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('At least one image is required')
  })
})

describe('ProductImageUpload — file validation', () => {
  it('rejects file with invalid type and shows error badge', async () => {
    // applyAccept: false — bypass the <input accept> filter so the invalid file reaches onChange
    const user = userEvent.setup({ applyAccept: false })
    const mockOnImagesChange = vi.fn()
    render(<ProductImageUpload onImagesChange={mockOnImagesChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const invalidFile = makeImageFile('document.pdf', 'application/pdf')
    await user.upload(input, invalidFile)

    expect(await screen.findByText('Only JPG, PNG and WebP images are allowed')).toBeInTheDocument()
    expect(mockRequestPresignedUrl).not.toHaveBeenCalled()
  })

  it('rejects file exceeding 5MB and shows error badge', async () => {
    const user = userEvent.setup()
    render(<ProductImageUpload onImagesChange={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const oversizeFile = makeImageFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024)
    await user.upload(input, oversizeFile)

    expect(await screen.findByText('File size must not exceed 5 MB')).toBeInTheDocument()
    expect(mockRequestPresignedUrl).not.toHaveBeenCalled()
  })
})

describe('ProductImageUpload — upload flow', () => {
  it('calls requestPresignedUrl then uploadFileToS3 for valid file', async () => {
    const user = userEvent.setup()
    const mockOnImagesChange = vi.fn()
    render(<ProductImageUpload onImagesChange={mockOnImagesChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const validFile = makeImageFile('ring.jpg', 'image/jpeg')
    await user.upload(input, validFile)

    await waitFor(() => {
      expect(mockRequestPresignedUrl).toHaveBeenCalledWith('ring.jpg', 'image/jpeg', 'mock-token')
      expect(mockUploadFileToS3).toHaveBeenCalledWith(
        validFile,
        'https://s3.amazonaws.com/bucket/products/uuid.jpg?signed',
        expect.any(Function),
      )
    })
  })

  it('calls onImagesChange with publicUrl after successful upload', async () => {
    const user = userEvent.setup()
    const mockOnImagesChange = vi.fn()
    render(<ProductImageUpload onImagesChange={mockOnImagesChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeImageFile('ring.jpg', 'image/jpeg'))

    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith(
        expect.arrayContaining(['https://s3.amazonaws.com/bucket/products/uuid.jpg']),
      )
    })
  })

  it('shows remove button for each uploaded image', async () => {
    const user = userEvent.setup()
    render(<ProductImageUpload onImagesChange={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeImageFile('ring.jpg', 'image/jpeg'))

    expect(
      await screen.findByRole('button', { name: /remove image ring\.jpg/i }),
    ).toBeInTheDocument()
  })

  it('calls onImagesChange with empty array when image is removed', async () => {
    const user = userEvent.setup()
    const mockOnImagesChange = vi.fn()
    render(<ProductImageUpload onImagesChange={mockOnImagesChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeImageFile('ring.jpg', 'image/jpeg'))

    await waitFor(() => {
      expect(mockRequestPresignedUrl).toHaveBeenCalled()
    })

    const removeButton = await screen.findByRole('button', { name: /remove image ring\.jpg/i })
    await user.click(removeButton)

    await waitFor(() => {
      const lastCall = mockOnImagesChange.mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual([])
    })
  })
})

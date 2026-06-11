import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductImageGallery } from '../product-image-gallery'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next/image', () => ({
  // next/image mock for tests — native <img> is intentional here, not production code
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    priority: _priority,
    ...props
  }: {
    src: string
    alt: string
    fill?: boolean
    sizes?: string
    priority?: boolean
    [key: string]: unknown
  }) => <img src={src} alt={alt} {...props} />,
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'imageAlt') return `photo ${values?.index}`
    if (key === 'thumbnailsLabel') return 'Product photo thumbnails'
    if (key === 'thumbnailAlt') return `Photo ${values?.index}`
    return key
  },
}))

const twoImages = ['https://cdn.example.com/ring-1.jpg', 'https://cdn.example.com/ring-2.jpg']

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('product-image-gallery')
  await $allureSeverity('normal')
})

describe('ProductImageGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the first image as active on initial load', () => {
    render(<ProductImageGallery images={twoImages} productTitle="Silver Ring" />)

    // When there are multiple images, the main figure and thumbnail share the same alt text.
    // Index 0 is always the main (larger) image rendered inside <figure>.
    const allMatchingImages = screen.getAllByAltText('Silver Ring — photo 1')
    expect(allMatchingImages[0]).toHaveAttribute('src', twoImages[0])
  })

  it('does not render thumbnails when there is only one image', () => {
    render(<ProductImageGallery images={[twoImages[0]!]} productTitle="Silver Ring" />)

    expect(screen.queryByRole('list', { name: 'Product photo thumbnails' })).not.toBeInTheDocument()
  })

  it('renders thumbnail buttons when there are multiple images', () => {
    render(<ProductImageGallery images={twoImages} productTitle="Silver Ring" />)

    const thumbnailList = screen.getByRole('list', { name: 'Product photo thumbnails' })
    expect(thumbnailList).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('switches the main image when a thumbnail is clicked', () => {
    render(<ProductImageGallery images={twoImages} productTitle="Silver Ring" />)

    const secondThumbnail = screen.getByRole('button', { name: 'Photo 2' })
    fireEvent.click(secondThumbnail)

    // Main image and thumbnail both carry the same alt — get all and assert the first (main) one
    const allMatchingImages = screen.getAllByAltText('Silver Ring — photo 2')
    expect(allMatchingImages[0]).toHaveAttribute('src', twoImages[1])
  })

  it('marks the active thumbnail with aria-current="true"', () => {
    render(<ProductImageGallery images={twoImages} productTitle="Silver Ring" />)

    const firstThumbnail = screen.getByRole('button', { name: 'Photo 1' })
    expect(firstThumbnail).toHaveAttribute('aria-current', 'true')

    const secondThumbnail = screen.getByRole('button', { name: 'Photo 2' })
    expect(secondThumbnail).not.toHaveAttribute('aria-current')
  })

  it('updates aria-current after thumbnail click', () => {
    render(<ProductImageGallery images={twoImages} productTitle="Silver Ring" />)

    const secondThumbnail = screen.getByRole('button', { name: 'Photo 2' })
    fireEvent.click(secondThumbnail)

    expect(secondThumbnail).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Photo 1' })).not.toHaveAttribute('aria-current')
  })

  it('falls back to placeholder image when images array is empty', () => {
    render(<ProductImageGallery images={[]} productTitle="Silver Ring" />)

    // Only one image in DOM — no thumbnails rendered for empty list
    const mainImage = screen.getByAltText('Silver Ring — photo 1')
    expect(mainImage).toHaveAttribute('src', '/placeholder-product.jpg')
  })
})

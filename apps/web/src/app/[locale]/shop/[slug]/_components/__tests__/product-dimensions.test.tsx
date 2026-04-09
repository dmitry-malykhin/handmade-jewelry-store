import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ProductDimensions } from '../product-dimensions'
import { useMeasurementStore } from '@/store/measurement.store'
import type { Product } from '@jewelry/shared'

const necklaceProduct: Pick<
  Product,
  'lengthCm' | 'widthCm' | 'heightCm' | 'diameterCm' | 'weightGrams' | 'beadSizeMm'
> = {
  lengthCm: 45.72,
  widthCm: null,
  heightCm: null,
  diameterCm: null,
  weightGrams: 4.2,
  beadSizeMm: null,
}

const productWithNoMeasurements: typeof necklaceProduct = {
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  diameterCm: null,
  weightGrams: null,
  beadSizeMm: null,
}

beforeEach(() => {
  useMeasurementStore.setState({ measurementSystem: 'imperial' })
})

describe('ProductDimensions — rendering', () => {
  it('renders nothing when product has no dimension data', () => {
    const { container } = render(<ProductDimensions product={productWithNoMeasurements} />)

    expect(container.firstChild).toBeNull()
  })

  it('shows length in imperial (inches) by default', () => {
    render(<ProductDimensions product={necklaceProduct} />)

    // 45.72 cm → 18"
    expect(screen.getByText('18"')).toBeInTheDocument()
  })

  it('always shows weight in grams regardless of measurement system', () => {
    render(<ProductDimensions product={necklaceProduct} />)

    expect(screen.getByText('4.2 g')).toBeInTheDocument()
  })

  it('shows bead size always in mm regardless of measurement system', () => {
    const productWithBeads: typeof necklaceProduct = { ...necklaceProduct, beadSizeMm: 6 }
    render(<ProductDimensions product={productWithBeads} />)

    expect(screen.getByText('6 mm')).toBeInTheDocument()
  })

  it('does not render the toggle when only weight/beadSize are present (no length fields)', () => {
    const weightOnlyProduct: typeof necklaceProduct = {
      ...productWithNoMeasurements,
      weightGrams: 4.2,
    }
    const { container } = render(<ProductDimensions product={weightOnlyProduct} />)

    expect(container.querySelector('[role="group"]')).toBeNull()
  })
})

describe('ProductDimensions — measurement toggle', () => {
  it('shows the toggle when a length field is present', () => {
    render(<ProductDimensions product={necklaceProduct} />)

    expect(screen.getByRole('group', { name: /switch measurement system/i })).toBeInTheDocument()
  })

  it('switches from imperial to metric when cm button is clicked', async () => {
    render(<ProductDimensions product={necklaceProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /cm/i }))

    // 45.72 cm displayed as metric
    expect(screen.getByText('45.7 cm')).toBeInTheDocument()
  })

  it('switches back from metric to imperial when in button is clicked', async () => {
    useMeasurementStore.setState({ measurementSystem: 'metric' })
    render(<ProductDimensions product={necklaceProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /in/i }))

    expect(screen.getByText('18"')).toBeInTheDocument()
  })

  it('marks the active system button as pressed', () => {
    render(<ProductDimensions product={necklaceProduct} />)

    const imperialButton = screen.getByRole('button', { name: /in/i })
    expect(imperialButton).toHaveAttribute('aria-pressed', 'true')
    expect(imperialButton).toBeDisabled()
  })

  it('persists the measurement system choice to the store', async () => {
    render(<ProductDimensions product={necklaceProduct} />)

    await userEvent.click(screen.getByRole('button', { name: /cm/i }))

    expect(useMeasurementStore.getState().measurementSystem).toBe('metric')
  })
})

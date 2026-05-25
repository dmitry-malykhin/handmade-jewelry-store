import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as DiscountsApiModule from '@/lib/api/discounts'
import { DiscountsTable } from '../discounts-table'

const fetchAdminDiscountsMock = vi.fn()
const updateAdminDiscountMock = vi.fn()
const deleteAdminDiscountMock = vi.fn()
const clipboardWriteMock = vi.fn()

vi.mock('@/lib/api/discounts', async () => {
  const actual = await vi.importActual<typeof DiscountsApiModule>('@/lib/api/discounts')
  return {
    ...actual,
    fetchAdminDiscounts: (...args: unknown[]) => fetchAdminDiscountsMock(...args),
    updateAdminDiscount: (...args: unknown[]) => updateAdminDiscountMock(...args),
    deleteAdminDiscount: (...args: unknown[]) => deleteAdminDiscountMock(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

// confirm() is used for delete confirmation — auto-accept in tests
const originalConfirm = global.confirm

function buildDiscount(
  overrides: Partial<DiscountsApiModule.Discount> = {},
): DiscountsApiModule.Discount {
  return {
    id: 'disc-1',
    code: 'WELCOME10',
    type: 'PERCENTAGE',
    value: 10,
    minOrderCents: 0,
    maxUsages: null,
    usageCount: 0,
    expiresAt: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('DiscountsTable', () => {
  beforeEach(() => {
    fetchAdminDiscountsMock.mockReset()
    updateAdminDiscountMock.mockReset()
    deleteAdminDiscountMock.mockReset()
    clipboardWriteMock.mockReset()
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => Promise.resolve(clipboardWriteMock(text)) },
    })
    global.confirm = () => true
  })

  afterAll(() => {
    global.confirm = originalConfirm
  })

  it('renders empty state when there are no discounts', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText(/No discount codes yet/i)).toBeInTheDocument())
  })

  it('renders code, formatted value, usage, and status badge for each discount', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([
      buildDiscount({ code: 'WELCOME10', value: 10, usageCount: 3, maxUsages: 100 }),
    ])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText('WELCOME10')).toBeInTheDocument())
    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByText(/3 \/ 100/)).toBeInTheDocument()
    expect(screen.getByText(/Active/i)).toBeInTheDocument()
  })

  it('formats FIXED_AMOUNT value as dollars', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([
      buildDiscount({ type: 'FIXED_AMOUNT', value: 500, code: 'TENBUCKS' }),
    ])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText('TENBUCKS')).toBeInTheDocument())
    expect(screen.getByText('$5.00')).toBeInTheDocument()
  })

  it('shows "Expired" badge when expiresAt is in the past', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([
      buildDiscount({ expiresAt: '2020-01-01T00:00:00Z' }),
    ])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText(/Expired/i)).toBeInTheDocument())
  })

  it('shows "Exhausted" badge when usageCount reaches maxUsages', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([buildDiscount({ maxUsages: 5, usageCount: 5 })])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText(/Exhausted/i)).toBeInTheDocument())
  })

  it('shows "Disabled" badge when isActive=false', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([buildDiscount({ isActive: false })])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText(/Disabled/i)).toBeInTheDocument())
  })

  it('copies the code to clipboard when the code button is clicked', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([buildDiscount()])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText('WELCOME10')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Copy code/i }))

    expect(clipboardWriteMock).toHaveBeenCalledWith('WELCOME10')
  })

  it('opens confirmation dialog without calling delete', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([buildDiscount()])

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText('WELCOME10')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Delete code WELCOME10/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(deleteAdminDiscountMock).not.toHaveBeenCalled()
  })

  it('calls deleteAdminDiscount after dialog confirmation', async () => {
    fetchAdminDiscountsMock.mockResolvedValueOnce([buildDiscount()])
    deleteAdminDiscountMock.mockResolvedValueOnce(undefined)

    render(<DiscountsTable />)

    await waitFor(() => expect(screen.getByText('WELCOME10')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Delete code WELCOME10/i }))

    const dialog = await screen.findByRole('dialog')
    // The destructive primary button inside the dialog is labelled "Delete"
    // (the row trash button uses "Delete code …" aria-label).
    const confirmButton = within(dialog).getByRole('button', { name: /^delete$/i })
    await userEvent.click(confirmButton)

    await waitFor(() =>
      expect(deleteAdminDiscountMock).toHaveBeenCalledWith('disc-1', 'test-token'),
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import type * as OrdersApiModule from '@/lib/api/orders'
import { RefundOrderModal } from '../refund-order-modal'

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof OrdersApiModule>('@/lib/api/orders')
  return { ...actual, refundAdminOrder: vi.fn() }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}))

describe('RefundOrderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderModal(overrides: Partial<React.ComponentProps<typeof RefundOrderModal>> = {}) {
    return render(
      <RefundOrderModal
        isOpen
        onClose={() => {}}
        orderId="order_abcdef1234567890"
        orderTotal={100}
        alreadyRefunded={0}
        {...overrides}
      />,
    )
  }

  it('renders the modal title with the last 8 chars of the orderId uppercased', () => {
    renderModal()
    expect(screen.getByText(/34567890/)).toBeInTheDocument()
  })

  it('shows the remaining refundable amount, accounting for prior refunds', () => {
    renderModal({ orderTotal: 100, alreadyRefunded: 30 })
    // 100 - 30 = 70 — both the remaining line and the amount input placeholder
    // show this value, so multiple matches are expected.
    expect(screen.getAllByText(/70\.00/).length).toBeGreaterThan(0)
  })

  it('shows full order total as remaining for first-time refunds', () => {
    renderModal({ orderTotal: 49.98, alreadyRefunded: 0 })
    expect(screen.getAllByText(/49\.98/).length).toBeGreaterThan(0)
  })

  it('renders all required form fields (amount, reason select, note)', () => {
    renderModal()
    // Amount input — type=number → role 'spinbutton'
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    // Reason — shadcn Select renders as combobox
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    // Note — textarea
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders Cancel and Issue refund action buttons', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Issue refund/i })).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <RefundOrderModal
        isOpen={false}
        onClose={() => {}}
        orderId="order_abcdef1234567890"
        orderTotal={100}
        alreadyRefunded={0}
      />,
    )
    expect(screen.queryByText(/34567890/)).not.toBeInTheDocument()
  })
})

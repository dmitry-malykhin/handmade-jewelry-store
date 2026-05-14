import { buildRefundProcessedEmail } from './refund-processed.template'

describe('buildRefundProcessedEmail', () => {
  // TC-EMAIL-009 — full refund happy path
  it('renders the refund amount formatted as USD', () => {
    const { html } = buildRefundProcessedEmail({
      recipientEmail: 'jane@example.com',
      orderId: 'order_abcdef1234567890',
      refundAmount: 49.98,
    })
    expect(html).toContain('$49.98')
  })

  // TC-EMAIL-010 — partial refund — exact amount shown, not the full order total
  it('renders a partial refund amount exactly (no rounding to full order total)', () => {
    const { html } = buildRefundProcessedEmail({
      recipientEmail: 'jane@example.com',
      orderId: 'order_abcdef1234567890',
      refundAmount: 20,
    })
    expect(html).toContain('$20.00')
    expect(html).not.toContain('$49.98')
  })

  // TC-EMAIL-009 — green amount block (semantic positive color)
  it('renders the refund amount in the green confirmation color (#22a722)', () => {
    const { html } = buildRefundProcessedEmail({
      recipientEmail: 'jane@example.com',
      orderId: 'order_abcdef1234567890',
      refundAmount: 49.98,
    })
    // The green color is applied to the cell containing the amount
    expect(html).toMatch(/color:\s*#22a722[^"]*">\s*\$49\.98/)
  })

  it('renders subject with last 8 chars of orderId uppercased', () => {
    const { subject } = buildRefundProcessedEmail({
      recipientEmail: 'jane@example.com',
      orderId: 'order_abcdef1234567890',
      refundAmount: 49.98,
    })
    expect(subject).toBe('Refund processed — #34567890')
  })
})

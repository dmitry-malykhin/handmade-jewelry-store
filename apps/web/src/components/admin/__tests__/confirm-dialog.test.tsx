import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../confirm-dialog'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/admin')
  await $allureSubSuite('confirm-dialog')
  await $allureSeverity('normal')
})

describe('ConfirmDialog — rendering', () => {
  it('does not render dialog content when closed', () => {
    render(<ConfirmDialog open={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Delete?" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title + description when open', () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete product?"
        description="This action is permanent."
      />,
    )

    expect(screen.getByText('Delete product?')).toBeInTheDocument()
    expect(screen.getByText('This action is permanent.')).toBeInTheDocument()
  })

  it('uses localized fallback labels when none are passed', () => {
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="X" />)

    // en.json: "confirmDialogCancel" = "Cancel", "confirmDialogConfirm" = "Confirm"
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument()
  })

  it('uses custom labels when provided', () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="X"
        confirmLabel="Delete"
        cancelLabel="Keep it"
      />,
    )

    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^keep it$/i })).toBeInTheDocument()
  })
})

describe('ConfirmDialog — interaction', () => {
  it('Confirm click fires onConfirm', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={onConfirm} title="X" />)

    await user.click(screen.getByRole('button', { name: /^confirm$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Cancel click fires onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmDialog open onClose={onClose} onConfirm={vi.fn()} title="X" />)

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClose while pending (mutation in flight)', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmDialog open isPending onClose={onClose} onConfirm={vi.fn()} title="X" />)

    // Both buttons are disabled while pending — clicking them is a no-op.
    const cancelButton = screen.getByRole('button', { name: /^cancel$/i })
    expect(cancelButton).toBeDisabled()
    await user.click(cancelButton)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('disables confirm independently via confirmDisabled (cancel stays enabled)', () => {
    render(<ConfirmDialog open confirmDisabled onClose={vi.fn()} onConfirm={vi.fn()} title="X" />)

    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^cancel$/i })).not.toBeDisabled()
  })

  it('applies destructive background by default', () => {
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="X" />)

    const dialog = screen.getByRole('dialog')
    const confirmButton = within(dialog).getByRole('button', { name: /^confirm$/i })
    // The destructive variant Button has bg-destructive — used as the
    // visual signal for delete-style actions.
    expect(confirmButton.className).toMatch(/bg-destructive/)
  })

  it('drops destructive background when confirmVariant="default"', () => {
    render(
      <ConfirmDialog
        open
        confirmVariant="default"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="X"
      />,
    )

    const dialog = screen.getByRole('dialog')
    const confirmButton = within(dialog).getByRole('button', { name: /^confirm$/i })
    expect(confirmButton.className).not.toMatch(/bg-destructive/)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils'
import { HelpButton } from '../help-button'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// HelpDrawer fetches /api/admin-help/{slug} on open. We stub the network so
// these tests stay focused on the trigger / shortcut behaviour.
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve('# Help'),
  }) as typeof fetch
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/admin')
  await $allureSubSuite('help-button')
  await $allureSeverity('normal')
})

describe('HelpButton — render', () => {
  it('renders a button with the help label', () => {
    render(<HelpButton slug="orders/overview" locale="en" />)
    // helpButtonLabel in en.json — matches the aria-label
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
  })
})

describe('HelpButton — `?` keyboard shortcut', () => {
  it('opens the drawer on `?` keypress', () => {
    render(<HelpButton slug="orders/overview" locale="en" />)

    // Drawer is closed initially — its title text shouldn't be in the DOM
    expect(screen.queryByText(/admin help/i)).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: '?' })

    // helpDrawerTitle = "Admin help"
    expect(screen.getByText(/admin help/i)).toBeInTheDocument()
  })

  it('ignores `?` while focus is inside an INPUT', () => {
    // Render an input alongside the button — focus then dispatch `?`. Without
    // the guard, every form field on every admin page would trap the user.
    render(
      <>
        <input data-testid="some-input" />
        <HelpButton slug="orders/overview" locale="en" />
      </>,
    )

    const input = screen.getByTestId('some-input')
    input.focus()
    fireEvent.keyDown(input, { key: '?' })

    expect(screen.queryByText(/admin help/i)).not.toBeInTheDocument()
  })

  it('ignores `?` while focus is inside a TEXTAREA', () => {
    render(
      <>
        <textarea data-testid="some-textarea" />
        <HelpButton slug="orders/overview" locale="en" />
      </>,
    )

    const textarea = screen.getByTestId('some-textarea')
    textarea.focus()
    fireEvent.keyDown(textarea, { key: '?' })

    expect(screen.queryByText(/admin help/i)).not.toBeInTheDocument()
  })

  it('ignores `?` while focus is inside a contentEditable element', () => {
    render(
      <>
        <div data-testid="rich-text" />
        <HelpButton slug="orders/overview" locale="en" />
      </>,
    )

    // jsdom doesn't fully implement HTMLElement.isContentEditable as a computed
    // property — stub it on the specific element so the runtime check has a
    // truthy value to read.
    const editable = screen.getByTestId('rich-text')
    Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true })
    editable.focus()
    fireEvent.keyDown(editable, { key: '?' })

    expect(screen.queryByText(/admin help/i)).not.toBeInTheDocument()
  })
})

describe('HelpButton — click', () => {
  it('opens the drawer when the button is clicked', () => {
    render(<HelpButton slug="orders/overview" locale="en" />)

    fireEvent.click(screen.getByRole('button', { name: /help/i }))

    expect(screen.getByText(/admin help/i)).toBeInTheDocument()
  })
})

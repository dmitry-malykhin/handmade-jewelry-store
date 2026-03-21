import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders children text', () => {
    render(<Button>Add to Cart</Button>)
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument()
  })

  it('renders as a <button> element by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('applies the default variant class', () => {
    render(<Button>Default</Button>)
    // Default variant uses bg-primary
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('applies the ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')
  })

  it('applies the outline variant class', () => {
    render(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('applies the destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })

  it('applies additional className passed via props', () => {
    render(<Button className="my-custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('my-custom-class')
  })

  // ── Size variants ──────────────────────────────────────────────────────────

  it('applies the sm size class', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8')
  })

  it('applies the lg size class', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')
  })

  // ── Disabled state ─────────────────────────────────────────────────────────

  it('is disabled when the disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not fire onClick when disabled', async () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  // ── Interaction ────────────────────────────────────────────────────────────

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('is focusable via keyboard', async () => {
    render(<Button>Focusable</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()
  })

  // ── asChild (Radix Slot) ───────────────────────────────────────────────────

  it('renders as an <a> element when asChild is used with <a>', () => {
    render(
      <Button asChild>
        <a href="/shop">Shop Now</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Shop Now' })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/shop')
  })
})

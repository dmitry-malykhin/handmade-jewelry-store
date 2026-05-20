import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { HelpDrawer } from '../help-drawer'

const noop = vi.fn()

describe('HelpDrawer — lazy fetch', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('# Hello\n\nbody'),
    }) as typeof fetch
  })

  it('does not call fetch while closed', () => {
    render(<HelpDrawer slug="orders/overview" locale="en" isOpen={false} onClose={noop} />)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches /api/admin-help/{locale}/{slug} on open and renders the markdown', async () => {
    render(<HelpDrawer slug="orders/overview" locale="en" isOpen onClose={noop} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin-help/en/orders/overview')
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument()
  })

  it('uses the active locale in the URL (ru example)', async () => {
    render(<HelpDrawer slug="orders/overview" locale="ru" isOpen onClose={noop} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin-help/ru/orders/overview')
    })
  })

  it('shows the slug in the drawer header so admins can grep the file path', () => {
    render(<HelpDrawer slug="customers/profile" locale="en" isOpen onClose={noop} />)
    expect(screen.getByText('customers/profile')).toBeInTheDocument()
  })
})

describe('HelpDrawer — error states', () => {
  it('renders the not-found message on HTTP 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as typeof fetch

    render(<HelpDrawer slug="missing/page" locale="en" isOpen onClose={noop} />)

    // helpDrawerNotFound in en.json
    expect(await screen.findByText(/no help article/i)).toBeInTheDocument()
  })

  it('renders the error message on HTTP 500', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as typeof fetch

    render(<HelpDrawer slug="orders/overview" locale="en" isOpen onClose={noop} />)

    expect(await screen.findByText(/500/)).toBeInTheDocument()
  })

  it('renders the error message when fetch itself throws (network down)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as typeof fetch

    render(<HelpDrawer slug="orders/overview" locale="en" isOpen onClose={noop} />)

    expect(await screen.findByText(/offline/i)).toBeInTheDocument()
  })
})

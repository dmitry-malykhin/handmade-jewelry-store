import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test-utils'
import { NewsletterForm } from '../newsletter-form'
import * as newsletterApi from '@/lib/api/newsletter'
import { ApiError } from '@/lib/api/client'

describe('NewsletterForm', () => {
  beforeEach(() => {
    vi.spyOn(newsletterApi, 'subscribeToNewsletter').mockResolvedValue({ status: 'queued' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a validation error and does not call the API for an invalid email', async () => {
    const user = userEvent.setup()
    render(<NewsletterForm />)

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
    expect(newsletterApi.subscribeToNewsletter).not.toHaveBeenCalled()
  })

  it('submits a valid email and shows the success state', async () => {
    const user = userEvent.setup()
    render(<NewsletterForm />)

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    await waitFor(() =>
      expect(newsletterApi.subscribeToNewsletter).toHaveBeenCalledWith('jane@example.com'),
    )
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
    // The form input is gone in the success state
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
  })

  it('shows the API error message when subscribeToNewsletter throws an ApiError', async () => {
    vi.spyOn(newsletterApi, 'subscribeToNewsletter').mockRejectedValueOnce(
      new ApiError(503, 'API 503: Newsletter provider unavailable'),
    )
    const user = userEvent.setup()
    render(<NewsletterForm />)

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe/i }))

    expect(await screen.findByText(/newsletter provider unavailable/i)).toBeInTheDocument()
  })

  it('renders distinct ids per variant so the same form can mount twice', () => {
    const { container, rerender } = render(<NewsletterForm variant="footer" />)
    expect(container.querySelector('#newsletter-email-footer')).not.toBeNull()

    rerender(<NewsletterForm variant="hero" />)
    expect(container.querySelector('#newsletter-email-hero')).not.toBeNull()
  })
})

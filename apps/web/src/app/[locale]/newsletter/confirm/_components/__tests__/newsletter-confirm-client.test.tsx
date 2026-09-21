import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { NewsletterConfirmClient } from '../newsletter-confirm-client'
import * as newsletterApi from '@/lib/api/newsletter'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('newsletter-confirm')
  await $allureSeverity('critical')
})

describe('NewsletterConfirmClient', () => {
  beforeEach(() => {
    searchParams.delete('token')
    searchParams.delete('email')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the success state when the API confirms the token', async () => {
    searchParams.set('token', 'tok-xyz')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'confirmNewsletterSubscription').mockResolvedValueOnce({
      status: 'confirmed',
    })

    render(<NewsletterConfirmClient />)

    await waitFor(() =>
      expect(newsletterApi.confirmNewsletterSubscription).toHaveBeenCalledWith(
        'a@b.com',
        'tok-xyz',
      ),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/subscribed/i)
  })

  it('shows the already-subscribed state when the server reports it', async () => {
    searchParams.set('token', 'tok-xyz')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'confirmNewsletterSubscription').mockResolvedValueOnce({
      status: 'already-confirmed',
    })

    render(<NewsletterConfirmClient />)

    expect(await screen.findByRole('status')).toHaveTextContent(/already subscribed/i)
  })

  it('shows the error state when token or email is missing from the URL', async () => {
    render(<NewsletterConfirmClient />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/confirmation failed/i)
  })

  it('shows the error state when the API rejects the token', async () => {
    searchParams.set('token', 'bad')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'confirmNewsletterSubscription').mockRejectedValueOnce(
      new Error('invalid'),
    )

    render(<NewsletterConfirmClient />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/confirmation failed/i)
  })
})

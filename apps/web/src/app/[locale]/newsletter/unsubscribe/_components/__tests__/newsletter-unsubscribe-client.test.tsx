import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { NewsletterUnsubscribeClient } from '../newsletter-unsubscribe-client'
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
  await $allureSubSuite('newsletter-unsubscribe')
  await $allureSeverity('critical')
})

describe('NewsletterUnsubscribeClient', () => {
  beforeEach(() => {
    searchParams.delete('token')
    searchParams.delete('email')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the success state when the server confirms the unsubscribe', async () => {
    searchParams.set('token', 'tok-xyz')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'unsubscribeFromNewsletter').mockResolvedValueOnce({
      status: 'unsubscribed',
    })

    render(<NewsletterUnsubscribeClient />)

    await waitFor(() =>
      expect(newsletterApi.unsubscribeFromNewsletter).toHaveBeenCalledWith('a@b.com', 'tok-xyz'),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/unsubscribed/i)
  })

  it('shows the already-unsubscribed state', async () => {
    searchParams.set('token', 'tok-xyz')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'unsubscribeFromNewsletter').mockResolvedValueOnce({
      status: 'already-unsubscribed',
    })

    render(<NewsletterUnsubscribeClient />)

    expect(await screen.findByRole('status')).toHaveTextContent(/already unsubscribed/i)
  })

  it('shows the error state when token/email are missing', async () => {
    render(<NewsletterUnsubscribeClient />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unsubscribe failed/i)
  })

  it('shows the error state when the API rejects the token', async () => {
    searchParams.set('token', 'bad')
    searchParams.set('email', 'a@b.com')
    vi.spyOn(newsletterApi, 'unsubscribeFromNewsletter').mockRejectedValueOnce(new Error('invalid'))

    render(<NewsletterUnsubscribeClient />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unsubscribe failed/i)
  })
})

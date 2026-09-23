import { apiClient } from './client'

export interface NewsletterSubscribeResponse {
  status: 'pending-confirmation'
}

export interface NewsletterConfirmResponse {
  status: 'confirmed' | 'already-confirmed'
}

export interface SubscribeToNewsletterInput {
  email: string
  consent: boolean
  sourceUrl?: string
}

export async function subscribeToNewsletter(
  input: SubscribeToNewsletterInput,
): Promise<NewsletterSubscribeResponse> {
  return apiClient<NewsletterSubscribeResponse>('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function confirmNewsletterSubscription(
  email: string,
  token: string,
): Promise<NewsletterConfirmResponse> {
  return apiClient<NewsletterConfirmResponse>('/api/newsletter/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, token }),
  })
}

export interface NewsletterUnsubscribeResponse {
  status: 'unsubscribed' | 'already-unsubscribed'
}

export async function unsubscribeFromNewsletter(
  email: string,
  token: string,
): Promise<NewsletterUnsubscribeResponse> {
  return apiClient<NewsletterUnsubscribeResponse>('/api/newsletter/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ email, token }),
  })
}

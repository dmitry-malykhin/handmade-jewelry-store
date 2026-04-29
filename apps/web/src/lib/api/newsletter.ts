import { apiClient } from './client'

export interface NewsletterSubscribeResponse {
  status: 'queued' | 'skipped'
}

export async function subscribeToNewsletter(email: string): Promise<NewsletterSubscribeResponse> {
  return apiClient<NewsletterSubscribeResponse>('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

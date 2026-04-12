import { apiClient } from './client'

export interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
}

export async function sendContactMessage(values: ContactFormValues): Promise<void> {
  await apiClient<void>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

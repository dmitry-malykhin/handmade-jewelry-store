import { apiClient } from './client'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export async function registerUser(email: string, password: string): Promise<AuthTokens> {
  return apiClient<AuthTokens>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function loginUser(email: string, password: string): Promise<AuthTokens> {
  return apiClient<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logoutUser(accessToken: string): Promise<void> {
  await apiClient<void>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

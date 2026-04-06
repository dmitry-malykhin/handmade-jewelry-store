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

export async function forgotPassword(email: string): Promise<void> {
  await apiClient<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient<void>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function logoutUser(accessToken: string): Promise<void> {
  await apiClient<void>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

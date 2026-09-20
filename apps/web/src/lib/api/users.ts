import { apiClient } from './client'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
}

export interface UpdateProfileInput {
  name?: string
  phone?: string
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  return apiClient<UserProfile>('/api/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateProfile(
  accessToken: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  return apiClient<UserProfile>('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  })
}

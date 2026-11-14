import { API_BASE_URL, ApiError, apiClient } from './client'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
}

export interface DataExportResult {
  blob: Blob
  filename: string
}

// Parses `attachment; filename="foo.json"` to pull the filename. Browsers that
// strip the header leave us with the account-id fallback.
function extractFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback
  const match = /filename="([^"]+)"/.exec(contentDisposition)
  return match?.[1] ?? fallback
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

// GET /users/me/export — GDPR Art. 15 / Art. 20 download. Can't go through
// apiClient because that helper parses the body as JSON for state, whereas
// here we need the raw Blob + Content-Disposition filename for a browser save.
export async function downloadDataExport(accessToken: string): Promise<DataExportResult> {
  const response = await fetch(`${API_BASE_URL}/api/users/me/export`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  })
  if (!response.ok) {
    throw new ApiError(response.status, `API ${response.status}: /api/users/me/export`)
  }
  const blob = await response.blob()
  const filename = extractFilename(
    response.headers.get('Content-Disposition'),
    'senichka-data-export.json',
  )
  return { blob, filename }
}

// DELETE /users/me: GDPR Art. 17 erasure (#642). Server returns 204 on
// success, 403 on invalid password / confirmation phrase, 404 on ghost user.
export async function deleteOwnAccount(
  accessToken: string,
  password: string,
  confirmationPhrase: string,
): Promise<void> {
  await apiClient<void>('/api/users/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password, confirmationPhrase }),
  })
}

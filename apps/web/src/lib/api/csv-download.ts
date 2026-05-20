import { ApiError, API_BASE_URL } from './client'

interface DownloadCsvOptions {
  /** API path beginning with `/api/...`. */
  path: string
  /** Bearer token — admin CSV endpoints require ADMIN role. */
  accessToken: string
  /** Filename suggested to the browser. The `.csv` extension is added if missing. */
  filename: string
}

/**
 * Fetches a CSV admin export and triggers a browser download via an anchor
 * click + ObjectURL. Kept separate from `apiClient` because that helper
 * assumes a JSON response — CSV needs blob handling and a different error path.
 *
 * Note: the OS-level "Save As" dialog respects the `download` attribute even
 * when the server sets `Content-Disposition: attachment; filename="..."`,
 * so we always control the suggested name from the caller.
 */
export async function downloadCsv({
  path,
  accessToken,
  filename,
}: DownloadCsvOptions): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const message = response.statusText || `HTTP ${response.status}`
    throw new ApiError(response.status, message)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    // Always revoke even if click() throws — leaked ObjectURLs hold the blob
    // in memory for the lifetime of the page.
    URL.revokeObjectURL(objectUrl)
  }
}

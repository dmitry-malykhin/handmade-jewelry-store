import { ApiError, API_BASE_URL } from './client'

interface DownloadCsvOptions {
  path: string
  accessToken: string
  filename: string
}

// Separate from apiClient — that helper assumes JSON; CSV needs blob handling
// and never reads the response body for an error message.
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
    // Always revoke — leaked ObjectURLs hold the blob in memory for the page lifetime.
    URL.revokeObjectURL(objectUrl)
  }
}

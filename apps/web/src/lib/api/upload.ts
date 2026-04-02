import { apiClient } from './client'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number]

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_IMAGES_PER_PRODUCT = 10

export interface PresignedUrlResponse {
  uploadUrl: string
  publicUrl: string
}

export function isAllowedImageType(mimeType: string): mimeType is AllowedImageMimeType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

export async function requestPresignedUrl(
  fileName: string,
  contentType: AllowedImageMimeType,
  accessToken: string,
): Promise<PresignedUrlResponse> {
  return apiClient<PresignedUrlResponse>('/api/upload/presigned-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

/**
 * Upload a file directly to S3 using a presigned PUT URL.
 * Uses XMLHttpRequest instead of fetch to support upload progress events.
 */
export function uploadFileToS3(
  file: File,
  uploadUrl: string,
  onProgress?: (progressPercent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      // S3 presigned PUT returns 200 on success
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('S3 upload was aborted'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

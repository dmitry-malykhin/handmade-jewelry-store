export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  // Spread options before headers — if a caller passes only Authorization,
  // an inverted order would drop Content-Type and NestJS body-parser silently
  // discards the JSON body.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `${response.status}: ${response.statusText} — ${path}`
    try {
      const errorBody = (await response.json()) as { message?: string | string[] }
      if (errorBody.message) {
        const bodyMessage = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : errorBody.message
        errorMessage = `${response.status}: ${bodyMessage}`
      }
    } catch {
      // response body is not JSON — keep default message
    }
    throw new ApiError(response.status, `API ${errorMessage}`)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

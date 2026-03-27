/**
 * Base API client for all requests to the NestJS backend.
 *
 * Usage (in lib/api/products.ts etc.):
 *   const products = await apiClient<Product[]>('/products')
 *
 * Environment:
 *   NEXT_PUBLIC_API_URL — set in .env.local (defaults to http://localhost:4000)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    // Attempt to extract NestJS error message from response body
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

  return response.json() as Promise<T>
}

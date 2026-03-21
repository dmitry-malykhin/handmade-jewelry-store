import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { apiClient, ApiError } from '@/lib/api/client'
import { server } from '@/test-utils/msw/server'

describe('ApiError', () => {
  it('stores the HTTP status code', () => {
    const error = new ApiError(404, 'Not Found')
    expect(error.status).toBe(404)
  })

  it('stores the error message', () => {
    const error = new ApiError(500, 'Internal Server Error')
    expect(error.message).toBe('Internal Server Error')
  })

  it('has the correct error name for instanceof checks', () => {
    const error = new ApiError(403, 'Forbidden')
    expect(error.name).toBe('ApiError')
  })

  it('is an instance of Error', () => {
    const error = new ApiError(400, 'Bad Request')
    expect(error).toBeInstanceOf(Error)
  })

  it('is an instance of ApiError', () => {
    const error = new ApiError(400, 'Bad Request')
    expect(error).toBeInstanceOf(ApiError)
  })
})

describe('apiClient()', () => {
  it('returns parsed JSON on a successful response', async () => {
    const products = await apiClient<{ id: string }[]>('/products')
    expect(products).toHaveLength(2)
    expect(products[0].id).toBe('prod-1')
  })

  it('throws ApiError with correct status on 404', async () => {
    server.use(
      http.get('http://localhost:4000/not-found', () => {
        return new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      }),
    )

    await expect(apiClient('/not-found')).rejects.toBeInstanceOf(ApiError)

    try {
      await apiClient('/not-found')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(404)
    }
  })

  it('throws ApiError with correct status on 500', async () => {
    server.use(
      http.get('http://localhost:4000/broken', () => {
        return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
      }),
    )

    try {
      await apiClient('/broken')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(500)
    }
  })

  it('sends Content-Type: application/json header by default', async () => {
    let capturedContentType: string | null = null

    server.use(
      http.get('http://localhost:4000/check-headers', ({ request }) => {
        capturedContentType = request.headers.get('content-type')
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiClient('/check-headers')
    expect(capturedContentType).toBe('application/json')
  })
})

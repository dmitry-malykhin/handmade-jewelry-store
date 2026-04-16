import { RequestLoggerMiddleware } from '../request-logger.middleware'
import type { Request, Response } from 'express'

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    method: 'GET',
    originalUrl: '/api/products',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue(undefined),
    ...overrides,
  } as unknown as Request
}

function buildMockResponse(): Response & { finishListeners: Array<() => void> } {
  const finishListeners: Array<() => void> = []
  return {
    statusCode: 200,
    setHeader: jest.fn(),
    on: jest.fn((event: string, listener: () => void) => {
      if (event === 'finish') finishListeners.push(listener)
    }),
    finishListeners,
  } as unknown as Response & { finishListeners: Array<() => void> }
}

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware()
    jest.spyOn(middleware['logger'], 'log').mockImplementation(() => undefined)
    jest.spyOn(middleware['logger'], 'warn').mockImplementation(() => undefined)
    jest.spyOn(middleware['logger'], 'error').mockImplementation(() => undefined)
  })

  it('sets X-Request-Id response header', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()
    const next = jest.fn()

    middleware.use(request, response, next)

    expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String))
  })

  it('attaches requestId to the request object', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()

    middleware.use(request, response, jest.fn())

    expect((request as unknown as Record<string, unknown>)['requestId']).toBeDefined()
  })

  it('reuses X-Request-Id from incoming request header', () => {
    const incomingRequestId = 'existing-id-123'
    const request = buildMockRequest({ headers: { 'x-request-id': incomingRequestId } })
    const response = buildMockResponse()

    middleware.use(request, response, jest.fn())

    expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', incomingRequestId)
  })

  it('calls next() to continue the middleware chain', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()
    const next = jest.fn()

    middleware.use(request, response, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('logs at info level for 2xx responses', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()
    response.statusCode = 200

    middleware.use(request, response, jest.fn())
    response.finishListeners.forEach((listener) => listener())

    expect(middleware['logger'].log).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({ statusCode: 200 }),
    )
  })

  it('logs at warn level for 4xx responses', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()
    response.statusCode = 400

    middleware.use(request, response, jest.fn())
    response.finishListeners.forEach((listener) => listener())

    expect(middleware['logger'].warn).toHaveBeenCalledWith(
      'Request client error',
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it('logs at error level for 5xx responses', () => {
    const request = buildMockRequest()
    const response = buildMockResponse()
    response.statusCode = 500

    middleware.use(request, response, jest.fn())
    response.finishListeners.forEach((listener) => listener())

    expect(middleware['logger'].error).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({ statusCode: 500 }),
    )
  })

  it('includes method and path in log data', () => {
    const request = buildMockRequest({ method: 'POST', originalUrl: '/api/orders' })
    const response = buildMockResponse()
    response.statusCode = 201

    middleware.use(request, response, jest.fn())
    response.finishListeners.forEach((listener) => listener())

    expect(middleware['logger'].log).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({ method: 'POST', path: '/api/orders' }),
    )
  })
})

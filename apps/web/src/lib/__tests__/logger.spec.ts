import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger (server-side)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Simulate server environment: window is undefined on Node.js
    vi.stubGlobal('window', undefined)
    vi.resetModules()

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('logger.info writes structured JSON to console.log', async () => {
    const { logger } = await import('../logger')
    logger.info('Order created', { orderId: 'order-1' })

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
    expect(output.level).toBe('info')
    expect(output.message).toBe('Order created')
    expect(output.orderId).toBe('order-1')
    expect(output.timestamp).toBeDefined()
  })

  it('logger.warn writes structured JSON to console.warn', async () => {
    const { logger } = await import('../logger')
    logger.warn('Slow query detected', { duration: 1200 })

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string)
    expect(output.level).toBe('warn')
    expect(output.message).toBe('Slow query detected')
  })

  it('logger.error writes structured JSON to console.error', async () => {
    const { logger } = await import('../logger')
    logger.error('Payment failed', { error: 'card_declined' })

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string)
    expect(output.level).toBe('error')
    expect(output.message).toBe('Payment failed')
    expect(output.error).toBe('card_declined')
  })

  it('logger.info works without meta argument', async () => {
    const { logger } = await import('../logger')
    expect(() => logger.info('App started')).not.toThrow()

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
    expect(output.message).toBe('App started')
  })
})

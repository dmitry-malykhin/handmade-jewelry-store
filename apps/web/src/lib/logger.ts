const isServer = typeof window === 'undefined'

function formatLogEntry(level: string, message: string, meta?: Record<string, unknown>): string {
  return JSON.stringify({ level, message, ...meta, timestamp: new Date().toISOString() })
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    if (isServer) console.log(formatLogEntry('info', message, meta))
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (isServer) console.warn(formatLogEntry('warn', message, meta))
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    if (isServer) console.error(formatLogEntry('error', message, meta))
  },
}

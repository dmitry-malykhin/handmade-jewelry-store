import * as winston from 'winston'

export function createWinstonLogger(): winston.LoggerOptions {
  const isProduction = process.env.NODE_ENV === 'production'

  const consoleTransport = new winston.transports.Console({
    format: isProduction
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ level, message, timestamp, context, ...rest }) => {
            const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''
            return `${timestamp} [${context ?? 'App'}] ${level}: ${message}${meta}`
          }),
        ),
  })

  return {
    level: isProduction ? 'info' : 'debug',
    transports: [consoleTransport],
    // Prevent logger errors from crashing the application
    exitOnError: false,
  }
}

import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'node:crypto'
import type { Logger } from 'winston'
import { requestContext } from '../context/request-context'

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  // Raw Winston logger — accepts meta natively. NestJS built-in Logger treats
  // the second arg as `context: string`, so passing an object printed
  // "[object Object]" (see #397).
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID()
    const startTime = Date.now()

    ;(request as unknown as Record<string, unknown>)['requestId'] = requestId
    response.setHeader('X-Request-Id', requestId)

    response.on('finish', () => {
      const { method, originalUrl } = request
      const { statusCode } = response
      const duration = Date.now() - startTime

      const logData = {
        context: 'HTTP',
        requestId,
        method,
        path: originalUrl,
        statusCode,
        duration,
        userAgent: request.get('user-agent'),
        ip: request.ip,
      }

      if (statusCode >= 500) {
        this.logger.error('Request failed', logData)
      } else if (statusCode >= 400) {
        this.logger.warn('Request client error', logData)
      } else {
        this.logger.info('Request completed', logData)
      }
    })

    requestContext.run({ requestId }, () => next())
  }
}

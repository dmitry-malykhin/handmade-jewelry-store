import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { HttpExceptionFilter } from './http-exception.filter'

function buildHost(requestUrl: string): {
  host: ArgumentsHost
  status: jest.Mock
  json: jest.Mock
} {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const response = { status } as unknown as Response
  const request = { url: requestUrl } as Request

  const host = {
    switchToHttp: () => ({
      getResponse: <T>() => response as unknown as T,
      getRequest: <T>() => request as unknown as T,
    }),
  } as ArgumentsHost

  return { host, status, json }
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/common')
  await $allureSubSuite('http-exception.filter')
  await $allureSeverity('normal')
})

describe('HttpExceptionFilter.catch()', () => {
  const filter = new HttpExceptionFilter()

  it('writes the status code from the exception', () => {
    const { host, status } = buildHost('/api/x')

    filter.catch(new NotFoundException('Not Found'), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
  })

  it('emits a JSON envelope with statusCode + message + path + ISO timestamp', () => {
    const { host, json } = buildHost('/api/orders/missing')

    filter.catch(new NotFoundException('Order not found'), host)

    expect(json).toHaveBeenCalledTimes(1)
    const payload = json.mock.calls[0][0]
    expect(payload).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Order not found',
      path: '/api/orders/missing',
    })
    expect(typeof payload.timestamp).toBe('string')
    expect(() => new Date(payload.timestamp).toISOString()).not.toThrow()
  })

  it('uses the message from getResponse() object when the exception body has one', () => {
    const { host, json } = buildHost('/api/x')
    const exception = new HttpException(
      { statusCode: 400, message: 'detailed body message' },
      HttpStatus.BAD_REQUEST,
    )

    filter.catch(exception, host)

    expect(json.mock.calls[0][0].message).toBe('detailed body message')
  })

  it('falls back to exception.message when the response body is a plain string', () => {
    const { host, json } = buildHost('/api/x')

    filter.catch(new BadRequestException('Bad input'), host)

    expect(json.mock.calls[0][0].message).toBe('Bad input')
  })
})

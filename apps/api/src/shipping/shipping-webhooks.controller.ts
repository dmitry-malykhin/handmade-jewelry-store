import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { ShippingService } from './shipping.service'

/**
 * Public webhook endpoint hit by EasyPost on every tracker update. The request
 * body must be the raw bytes (NOT the parsed JSON) so the HMAC signature
 * check in `verifyWebhookSignature` can recompute the digest. NestJS exposes
 * `req.rawBody` because `NestFactory.create(..., { rawBody: true })` is set in
 * `main.ts`.
 */
@Controller('webhooks/easypost')
export class ShippingWebhooksController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-easypost-signature') signature: string | undefined,
  ) {
    if (!request.rawBody) throw new BadRequestException('Missing raw request body')
    return this.shippingService.handleWebhook(request.rawBody.toString('utf8'), signature)
  }
}

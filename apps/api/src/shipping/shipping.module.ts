import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { EasypostMockClient } from './easypost-mock.client'
import { EASYPOST_CLIENT } from './easypost-client.token'
import { ShippingService } from './shipping.service'
import { AdminShippingController } from './admin-shipping.controller'
import { ShippingWebhooksController } from './shipping-webhooks.controller'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminShippingController, ShippingWebhooksController],
  providers: [
    ShippingService,
    // EasypostMockClient is wired by default — this is the "dry-run" mode used
    // pre-launch. When EASYPOST_API_KEY is configured we swap this provider for
    // the real EasyPost-backed client.
    { provide: EASYPOST_CLIENT, useClass: EasypostMockClient },
  ],
  exports: [ShippingService],
})
export class ShippingModule {}

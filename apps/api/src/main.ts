// instrument.ts MUST be the first import — Sentry hooks into Node.js internals
// and must run before any other module is loaded.
import './instrument'

import { ValidationPipe } from '@nestjs/common'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { getFrontendUrl } from './common/config/urls'
import { AppModule } from './app.module'
import { assertProductionEnv } from './common/config/required-env'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { SentryGlobalFilter } from '@sentry/nestjs/setup'

assertProductionEnv()

// Node 22 fetch (undici) doesn't honour HTTP(S)_PROXY by default. Production
// deploys don't set these vars; this only affects local dev behind a VPN proxy.
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}

async function bootstrap() {
  // rawBody: true — Stripe.webhooks.constructEvent() needs the raw Buffer.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })

  // Trust one proxy hop (Fly.io / CloudFront / ALB) so req.ip resolves to the
  // real client from X-Forwarded-For — otherwise ThrottlerGuard sees the LB IP
  // and every request looks like the same client.
  app.set('trust proxy', 1)

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  app.setGlobalPrefix('api')

  app.enableCors({
    origin: getFrontendUrl(),
    credentials: true,
  })

  // whitelist strips unknown properties (mass-assignment protection);
  // forbidNonWhitelisted returns 400 instead of silently dropping them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const { httpAdapter } = app.get(HttpAdapterHost)
  // Sentry filter MUST come first so it sees the raw exception before any
  // other filter wraps it into an HttpException.
  app.useGlobalFilters(new SentryGlobalFilter(httpAdapter), new HttpExceptionFilter())

  const port = process.env.API_PORT ?? 4000
  await app.listen(port)
}

bootstrap()

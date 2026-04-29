// instrument.ts MUST be the first import — Sentry hooks into Node.js internals
// and must run before any other module is loaded.
import './instrument'

import { ValidationPipe } from '@nestjs/common'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { SentryGlobalFilter } from '@sentry/nestjs/setup'

// Node 22's built-in fetch (undici) does not honour HTTP(S)_PROXY env vars by default.
// Local dev behind a corporate / personal VPN proxy needs an explicit dispatcher,
// otherwise outbound calls (Klaviyo, Stripe, Resend) bypass the proxy and fail.
// Production deploys do not set these vars → no behaviour change.
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}

async function bootstrap() {
  // rawBody: true — required for Stripe webhook signature verification.
  // stripe.webhooks.constructEvent() needs the raw Buffer, not parsed JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true })

  // Replace NestJS default logger with Winston so all internal NestJS logs
  // (module init, route mapping, etc.) go through the same structured pipeline.
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  app.setGlobalPrefix('api')

  // Allow requests from the Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  // whitelist: strips properties not in the DTO (protects against mass-assignment)
  // forbidNonWhitelisted: returns 400 if unknown properties are sent
  // transform: converts plain JSON body to typed DTO class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const { httpAdapter } = app.get(HttpAdapterHost)
  // SentryGlobalFilter catches all unhandled exceptions and reports 5xx errors to Sentry.
  // Must be registered BEFORE HttpExceptionFilter so Sentry sees the raw exception.
  app.useGlobalFilters(new SentryGlobalFilter(httpAdapter), new HttpExceptionFilter())

  const port = process.env.API_PORT ?? 4000
  await app.listen(port)
}

bootstrap()

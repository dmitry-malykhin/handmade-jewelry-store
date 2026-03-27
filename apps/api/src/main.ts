import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  // rawBody: true — required for Stripe webhook signature verification.
  // stripe.webhooks.constructEvent() needs the raw Buffer, not parsed JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true })

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

  app.useGlobalFilters(new HttpExceptionFilter())

  const port = process.env.API_PORT ?? 4000
  await app.listen(port)
}

bootstrap()

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())

  const port = process.env.API_PORT ?? 4000
  await app.listen(port)
}

bootstrap()

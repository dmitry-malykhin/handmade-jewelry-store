import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SentryModule } from '@sentry/nestjs/setup'
import { AdminModule } from './admin/admin.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { CategoriesModule } from './categories/categories.module'
import { OrdersModule } from './orders/orders.module'
import { PaymentsModule } from './payments/payments.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProductsModule } from './products/products.module'
import { StripeModule } from './stripe/stripe.module'
import { ContactModule } from './contact/contact.module'
import { HealthModule } from './health/health.module'
import { UploadModule } from './upload/upload.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    // Загружает apps/api/.env в process.env автоматически при старте
    // isGlobal: true — не нужно импортировать ConfigModule в каждом модуле
    ConfigModule.forRoot({ isGlobal: true }),
    // SentryModule.forRoot() wires Sentry into NestJS request lifecycle:
    // adds transaction spans per controller method and propagates trace context.
    SentryModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    StripeModule,
    PaymentsModule,
    UploadModule,
    ContactModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

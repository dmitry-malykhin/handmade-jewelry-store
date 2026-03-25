import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { ProductsModule } from './products/products.module'
import { CategoriesModule } from './categories/categories.module'
import { OrdersModule } from './orders/orders.module'

@Module({
  imports: [
    // Загружает apps/api/.env в process.env автоматически при старте
    // isGlobal: true — не нужно импортировать ConfigModule в каждом модуле
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

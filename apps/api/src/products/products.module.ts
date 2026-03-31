import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { AdminProductsController } from './admin-products.controller'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

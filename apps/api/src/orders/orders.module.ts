import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../email/email.module'
import { PrismaModule } from '../prisma/prisma.module'
import { AdminOrdersController } from './admin-orders.controller'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [PrismaModule, AuthModule, EmailModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

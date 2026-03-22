import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

// @Global makes PrismaService available in all modules without re-importing PrismaModule
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

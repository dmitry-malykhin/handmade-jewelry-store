import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
        // { level: 'query', emit: 'event' } — enable only for active debugging; very verbose
      ],
    })

    this.$on('warn' as never, (event: { message: string }) => {
      this.logger.warn('Prisma warning', { message: event.message })
    })

    this.$on('error' as never, (event: { message: string }) => {
      this.logger.error('Prisma error', { message: event.message })
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Database connected')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}

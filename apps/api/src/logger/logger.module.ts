import { Global, Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { createWinstonLogger } from './winston.config'

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonLogger(),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}

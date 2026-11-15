import { Module } from '@nestjs/common'
import { RetentionController } from './retention.controller'
import { DataRetentionService } from './retention.service'

@Module({
  controllers: [RetentionController],
  providers: [DataRetentionService],
})
export class RetentionModule {}

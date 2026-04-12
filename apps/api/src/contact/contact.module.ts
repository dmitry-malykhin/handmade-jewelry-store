import { Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}

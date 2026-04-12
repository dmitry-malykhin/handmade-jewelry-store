import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ContactService } from './contact.service'
import { SendContactMessageDto } from './dto/send-contact-message.dto'

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendMessage(@Body() sendContactMessageDto: SendContactMessageDto): Promise<void> {
    await this.contactService.sendMessage(sendContactMessageDto)
  }
}

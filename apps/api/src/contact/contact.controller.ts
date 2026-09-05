import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ContactService } from './contact.service'
import { SendContactMessageDto } from './dto/send-contact-message.dto'

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Two windows: 3/min blocks burst, 20/day blocks slow-drip.
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    default: { limit: 3, ttl: 60_000 },
    contactDaily: { limit: 20, ttl: 86_400_000 },
  })
  async sendMessage(@Body() sendContactMessageDto: SendContactMessageDto): Promise<void> {
    await this.contactService.sendMessage(sendContactMessageDto)
  }
}

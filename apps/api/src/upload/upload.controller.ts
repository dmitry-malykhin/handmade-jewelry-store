import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { PresignedUrlRequestDto } from './dto/presigned-url-request.dto'
import { UploadService } from './upload.service'

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  generatePresignedUrl(@Body() presignedUrlRequestDto: PresignedUrlRequestDto) {
    return this.uploadService.generatePresignedUrl(
      presignedUrlRequestDto.fileName,
      presignedUrlRequestDto.contentType,
    )
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AddressesService } from './addresses.service'
import { UpsertAddressDto } from './dto/upsert-address.dto'

@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.addressesService.findUserAddresses(user.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: UpsertAddressDto) {
    return this.addressesService.create(user.id, dto)
  }

  @Put(':id')
  update(@CurrentUser() user: User, @Param('id') addressId: string, @Body() dto: UpsertAddressDto) {
    return this.addressesService.update(user.id, addressId, dto)
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: User, @Param('id') addressId: string) {
    return this.addressesService.setDefault(user.id, addressId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') addressId: string) {
    return this.addressesService.remove(user.id, addressId)
  }
}

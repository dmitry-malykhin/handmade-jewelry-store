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
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { DiscountsService } from './discounts.service'
import { CreateDiscountDto } from './dto/create-discount.dto'
import { UpdateDiscountDto } from './dto/update-discount.dto'
import { ValidateDiscountDto } from './dto/validate-discount.dto'

/**
 * Public discount validation — called from the checkout page when a customer
 * enters a code. Returns the discount payload or throws a specific 4xx so the
 * checkout form can show a precise reason.
 */
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() validateDiscountDto: ValidateDiscountDto) {
    return this.discountsService.validate(validateDiscountDto)
  }
}

@Controller('admin/discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  findAll() {
    return this.discountsService.findAll()
  }

  @Post()
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.create(createDiscountDto)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') discountId: string, @Body() updateDiscountDto: UpdateDiscountDto) {
    return this.discountsService.update(discountId, updateDiscountDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') discountId: string) {
    return this.discountsService.remove(discountId)
  }
}

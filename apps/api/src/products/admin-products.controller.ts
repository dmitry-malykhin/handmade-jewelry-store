import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AdminProductQueryDto } from './dto/admin-product-query.dto'
import { UpdateProductStatusDto } from './dto/update-product-status.dto'
import { ProductsService } from './products.service'

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() adminProductQueryDto: AdminProductQueryDto) {
    return this.productsService.findAllAdmin(adminProductQueryDto)
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') productId: string,
    @Body() updateProductStatusDto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(productId, updateProductStatusDto.status)
  }
}

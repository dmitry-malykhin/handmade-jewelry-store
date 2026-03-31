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
  Query,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductQueryDto } from './dto/product-query.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() productQueryDto: ProductQueryDto) {
    return this.productsService.findAll(productQueryDto)
  }

  @Get(':slug')
  findOne(@Param('slug') productSlug: string) {
    return this.productsService.findOneBySlug(productSlug)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('slug') productSlug: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(productSlug, updateProductDto)
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('slug') productSlug: string) {
    return this.productsService.remove(productSlug)
  }
}

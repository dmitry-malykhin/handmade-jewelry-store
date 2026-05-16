import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { InventoryQueryDto } from './dto/inventory-query.dto'
import { ProductsService } from './products.service'

/**
 * Standalone DTO for the low-stock count endpoint. Kept inline since it's
 * trivial (single number) and reusing InventoryQueryDto would drag in fields
 * the count endpoint doesn't care about.
 */
class LowStockCountQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  threshold?: number = 3
}

@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminInventoryController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findInventory(@Query() inventoryQueryDto: InventoryQueryDto) {
    return this.productsService.findInventory(inventoryQueryDto)
  }

  /**
   * Cheap badge endpoint — returns just `{ count }` for the sidebar indicator.
   * Avoids loading the full inventory payload on every admin page navigation.
   */
  @Get('low-stock-count')
  async countLowStock(
    @Query() lowStockCountQueryDto: LowStockCountQueryDto,
  ): Promise<{ count: number }> {
    const count = await this.productsService.countLowStock(lowStockCountQueryDto.threshold)
    return { count }
  }
}

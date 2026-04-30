import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MergeWishlistDto } from './dto/merge-wishlist.dto'
import { WishlistService } from './wishlist.service'

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.wishlistService.getWishlist(user.id)
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  merge(@CurrentUser() user: User, @Body() dto: MergeWishlistDto) {
    return this.wishlistService.mergeGuestWishlist(user.id, dto.productIds)
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  add(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(user.id, productId)
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(user.id, productId)
  }
}

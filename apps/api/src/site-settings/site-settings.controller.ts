import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto'
import { SiteSettingsService } from './site-settings.service'

/**
 * Public settings endpoint — storefront reads from this to fetch store name,
 * social links, etc. No auth required because the data is by definition
 * customer-facing (visible in footer, contact page, etc.).
 */
@Controller('settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  findOne() {
    return this.siteSettingsService.getSettings()
  }
}

/**
 * Admin settings endpoint — same data, write access guarded by ADMIN role.
 * Split into its own controller so the public reader stays without the auth
 * guard chain.
 */
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  findOne() {
    return this.siteSettingsService.getSettings()
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  update(@Body() updateSiteSettingsDto: UpdateSiteSettingsDto) {
    return this.siteSettingsService.updateSettings(updateSiteSettingsDto)
  }
}

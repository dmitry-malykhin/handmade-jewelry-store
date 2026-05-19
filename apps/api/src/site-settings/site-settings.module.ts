import { Module } from '@nestjs/common'
import { AdminSiteSettingsController, SiteSettingsController } from './site-settings.controller'
import { SiteSettingsService } from './site-settings.service'

@Module({
  controllers: [SiteSettingsController, AdminSiteSettingsController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}

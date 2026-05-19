import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto'

// Single-row table — id is fixed so concurrent upserts converge on the same
// row. Picking 'default' (rather than e.g. a UUID) keeps the URL of the row
// stable across environments / database resets.
const SINGLETON_ID = 'default'

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Returns the singleton settings row, creating it with schema defaults if
   * it does not exist yet. Safe to call on a fresh database.
   */
  async getSettings() {
    return this.prismaService.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    })
  }

  /**
   * Partial update of the singleton row. Empty-string URL fields are coerced
   * to `null` so the row stays clean and the storefront can render the
   * "no social link" state via simple `!= null` checks.
   *
   * Cross-field validation (delivery min ≤ max) is enforced here rather than
   * in the DTO because class-validator doesn't see sibling fields cleanly.
   */
  async updateSettings(updateSiteSettingsDto: UpdateSiteSettingsDto) {
    const current = await this.getSettings()

    const nextMin =
      updateSiteSettingsDto.estimatedDeliveryMinDays ?? current.estimatedDeliveryMinDays
    const nextMax =
      updateSiteSettingsDto.estimatedDeliveryMaxDays ?? current.estimatedDeliveryMaxDays
    if (nextMin > nextMax) {
      throw new BadRequestException(
        `estimatedDeliveryMinDays (${nextMin}) cannot exceed estimatedDeliveryMaxDays (${nextMax})`,
      )
    }

    const normalised = {
      ...updateSiteSettingsDto,
      // Convert empty strings on social URLs to explicit null
      instagramUrl: normaliseUrlField(updateSiteSettingsDto.instagramUrl),
      pinterestUrl: normaliseUrlField(updateSiteSettingsDto.pinterestUrl),
      facebookUrl: normaliseUrlField(updateSiteSettingsDto.facebookUrl),
      tiktokUrl: normaliseUrlField(updateSiteSettingsDto.tiktokUrl),
    }

    return this.prismaService.siteSettings.update({
      where: { id: SINGLETON_ID },
      data: normalised,
    })
  }
}

function normaliseUrlField(value: string | null | undefined): string | null | undefined {
  // `undefined` = field not touched in this PATCH; preserve to skip the column
  if (value === undefined) return undefined
  if (value === null || value.trim() === '') return null
  return value.trim()
}

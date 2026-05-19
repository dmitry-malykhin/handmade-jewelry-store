import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { SiteSettingsService } from './site-settings.service'

const mockPrismaService = {
  siteSettings: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
}

const baseSettings = {
  id: 'default',
  storeName: 'Senichka',
  tagline: 'Handmade Beaded Jewelry',
  contactEmail: '',
  supportEmail: '',
  instagramUrl: null,
  pinterestUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  returnPolicyDays: 30,
  estimatedDeliveryMinDays: 3,
  estimatedDeliveryMaxDays: 7,
  freeShippingThresholdCents: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SiteSettingsService', () => {
  let siteSettingsService: SiteSettingsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteSettingsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    siteSettingsService = module.get<SiteSettingsService>(SiteSettingsService)
  })

  describe('getSettings()', () => {
    it('upserts the singleton row with id "default"', async () => {
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce(baseSettings)

      await siteSettingsService.getSettings()

      expect(mockPrismaService.siteSettings.upsert).toHaveBeenCalledWith({
        where: { id: 'default' },
        create: { id: 'default' },
        update: {},
      })
    })
  })

  describe('updateSettings()', () => {
    it('persists changed fields on the singleton row', async () => {
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce(baseSettings)
      mockPrismaService.siteSettings.update.mockResolvedValueOnce({
        ...baseSettings,
        storeName: 'New Name',
      })

      await siteSettingsService.updateSettings({ storeName: 'New Name' })

      expect(mockPrismaService.siteSettings.update).toHaveBeenCalledWith({
        where: { id: 'default' },
        data: expect.objectContaining({ storeName: 'New Name' }),
      })
    })

    it('normalises empty-string social URLs to null', async () => {
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce(baseSettings)
      mockPrismaService.siteSettings.update.mockResolvedValueOnce(baseSettings)

      await siteSettingsService.updateSettings({ instagramUrl: '   ' })

      expect(mockPrismaService.siteSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ instagramUrl: null }),
        }),
      )
    })

    it('preserves URL fields absent from the patch — Prisma sees undefined as "do not update"', async () => {
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce({
        ...baseSettings,
        instagramUrl: 'https://instagram.com/senichka',
      })
      mockPrismaService.siteSettings.update.mockResolvedValueOnce(baseSettings)

      await siteSettingsService.updateSettings({ storeName: 'Touch this only' })

      // instagramUrl is passed as `undefined` — Prisma treats undefined as
      // "skip this column", so the prior 'https://instagram.com/senichka'
      // value is preserved without us having to fetch + diff first.
      const callArg = mockPrismaService.siteSettings.update.mock.calls[0][0]
      expect(callArg.data.instagramUrl).toBeUndefined()
    })

    it('throws BadRequest when delivery min > delivery max', async () => {
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce(baseSettings)

      await expect(
        siteSettingsService.updateSettings({
          estimatedDeliveryMinDays: 10,
          estimatedDeliveryMaxDays: 5,
        }),
      ).rejects.toThrow(BadRequestException)

      expect(mockPrismaService.siteSettings.update).not.toHaveBeenCalled()
    })

    it('validates min/max against the existing row when only one side is in the patch', async () => {
      // Existing max=7; patch min=10 → 10 > 7 → reject
      mockPrismaService.siteSettings.upsert.mockResolvedValueOnce(baseSettings)

      await expect(
        siteSettingsService.updateSettings({ estimatedDeliveryMinDays: 10 }),
      ).rejects.toThrow(BadRequestException)
    })
  })
})

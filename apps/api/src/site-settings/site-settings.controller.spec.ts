import { Test, TestingModule } from '@nestjs/testing'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto'
import { AdminSiteSettingsController, SiteSettingsController } from './site-settings.controller'
import { SiteSettingsService } from './site-settings.service'

const mockService = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/site-settings')
  await $allureSubSuite('site-settings.controller')
  await $allureSeverity('normal')
})

describe('SiteSettingsController (public)', () => {
  let controller: SiteSettingsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteSettingsController],
      providers: [{ provide: SiteSettingsService, useValue: mockService }],
    }).compile()
    controller = module.get(SiteSettingsController)
    jest.clearAllMocks()
  })

  it('findOne() delegates to SiteSettingsService.getSettings', async () => {
    const settings = { id: 's1', storeName: 'Shop' }
    mockService.getSettings.mockResolvedValue(settings)

    const result = await controller.findOne()

    expect(mockService.getSettings).toHaveBeenCalled()
    expect(result).toBe(settings)
  })
})

describe('AdminSiteSettingsController', () => {
  let controller: AdminSiteSettingsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSiteSettingsController],
      providers: [{ provide: SiteSettingsService, useValue: mockService }],
    }).compile()
    controller = module.get(AdminSiteSettingsController)
    jest.clearAllMocks()
  })

  it('findOne() returns the service settings', async () => {
    mockService.getSettings.mockResolvedValue({ id: 's1', storeName: 'Shop' })

    const result = await controller.findOne()

    expect(result).toMatchObject({ storeName: 'Shop' })
  })

  it('update() passes the UpdateSiteSettingsDto to updateSettings', async () => {
    const dto = { storeName: 'Renamed' } as UpdateSiteSettingsDto
    mockService.updateSettings.mockResolvedValue({ id: 's1', ...dto })

    await controller.update(dto)

    expect(mockService.updateSettings).toHaveBeenCalledWith(dto)
  })
})

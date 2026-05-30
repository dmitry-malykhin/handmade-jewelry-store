import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockAdminService = {
  getStats: jest.fn(),
}

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) }
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) }

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/admin')
  await $allureSubSuite('admin.controller')
  await $allureSeverity('normal')
})

describe('AdminController', () => {
  let adminController: AdminController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile()

    adminController = module.get<AdminController>(AdminController)
  })

  afterEach(() => jest.clearAllMocks())

  describe('getStats', () => {
    it('returns stats from AdminService', async () => {
      const expectedStats = { productCount: 5, orderCount: 3, totalRevenueCents: 0 }
      mockAdminService.getStats.mockResolvedValue(expectedStats)

      const result = await adminController.getStats()

      expect(result).toEqual(expectedStats)
      expect(mockAdminService.getStats).toHaveBeenCalledTimes(1)
    })

    it('propagates service error when AdminService throws', async () => {
      mockAdminService.getStats.mockRejectedValue(new Error('Database unavailable'))

      await expect(adminController.getStats()).rejects.toThrow('Database unavailable')
    })
  })
})

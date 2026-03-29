import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'

const mockAdminService = {
  getStats: jest.fn(),
}

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) }
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) }

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

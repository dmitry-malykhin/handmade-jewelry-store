import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import type { Response } from 'express'
import { UsersExportService } from './users-export.service'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/users')
  await $allureSubSuite('users.controller')
  await $allureSeverity('normal')
})

describe('UsersController', () => {
  let usersController: UsersController
  let mockUsersService: {
    getProfile: jest.Mock
    updateProfile: jest.Mock
  }
  let mockUsersExportService: { exportForUser: jest.Mock }

  const authenticatedUser = { id: 'u1', email: 'a@b.com' } as User

  beforeEach(async () => {
    mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    }
    mockUsersExportService = { exportForUser: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: UsersExportService, useValue: mockUsersExportService },
      ],
    }).compile()

    usersController = module.get<UsersController>(UsersController)
  })

  describe('GET /users/me', () => {
    it('returns the authenticated user profile', async () => {
      const profile = { id: 'u1', email: 'a@b.com', name: 'Ada', phone: null }
      mockUsersService.getProfile.mockResolvedValueOnce(profile)

      const result = await usersController.me(authenticatedUser)

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('u1')
      expect(result).toBe(profile)
    })
  })

  describe('PATCH /users/me', () => {
    it('forwards the DTO to updateProfile scoped to the caller', async () => {
      const updated = { id: 'u1', email: 'a@b.com', name: 'Ada Lovelace', phone: '+34123' }
      mockUsersService.updateProfile.mockResolvedValueOnce(updated)

      const result = await usersController.updateMe(authenticatedUser, {
        name: 'Ada Lovelace',
        phone: '+34123',
      })

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('u1', {
        name: 'Ada Lovelace',
        phone: '+34123',
      })
      expect(result).toBe(updated)
    })
  })

  describe('GET /users/me/export (#559 GDPR Art. 15)', () => {
    function buildResponseMock() {
      const setHeader = jest.fn()
      return { response: { setHeader } as unknown as Response, setHeader }
    }

    it('returns the full export payload for the authenticated caller', async () => {
      const payload = { exportedAt: '2026-11-02T10:00:00.000Z', user: { id: 'u1' } }
      mockUsersExportService.exportForUser.mockResolvedValueOnce(payload)
      const { response } = buildResponseMock()

      const result = await usersController.exportMe(authenticatedUser, response)

      expect(mockUsersExportService.exportForUser).toHaveBeenCalledWith('u1')
      expect(result).toBe(payload)
    })

    it('sets Content-Disposition: attachment with a dated filename so browsers save instead of render', async () => {
      mockUsersExportService.exportForUser.mockResolvedValueOnce({
        exportedAt: '2026-11-02T10:00:00.000Z',
      })
      const { response, setHeader } = buildResponseMock()

      await usersController.exportMe(authenticatedUser, response)

      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="senichka-data-export-u1-2026-11-02\.json"$/),
      )
    })
  })
})

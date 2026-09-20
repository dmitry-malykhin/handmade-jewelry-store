import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
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

  const authenticatedUser = { id: 'u1', email: 'a@b.com' } as User

  beforeEach(async () => {
    mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
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
})

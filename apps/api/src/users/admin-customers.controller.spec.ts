import { Test, TestingModule } from '@nestjs/testing'
import { AdminCustomersController } from './admin-customers.controller'
import { UsersService } from './users.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/users')
  await $allureSubSuite('admin-customers.controller')
  await $allureSeverity('normal')
})

describe('AdminCustomersController', () => {
  let adminCustomersController: AdminCustomersController
  let mockUsersService: {
    findAllCustomers: jest.Mock
    findCustomerById: jest.Mock
  }

  beforeEach(async () => {
    mockUsersService = {
      findAllCustomers: jest.fn(),
      findCustomerById: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCustomersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile()

    adminCustomersController = module.get<AdminCustomersController>(AdminCustomersController)
  })

  describe('findAll', () => {
    it('delegates the query dto to usersService.findAllCustomers', async () => {
      const expectedList = { items: [], total: 0, page: 1, limit: 20 }
      mockUsersService.findAllCustomers.mockResolvedValueOnce(expectedList)

      const query = { page: 2, limit: 20, search: 'jane' }
      const result = await adminCustomersController.findAll(query)

      expect(mockUsersService.findAllCustomers).toHaveBeenCalledWith(query)
      expect(result).toBe(expectedList)
    })
  })

  describe('findOne', () => {
    it('delegates the id to usersService.findCustomerById', async () => {
      const expectedCustomer = { id: 'user-1', email: 'jane@example.com' }
      mockUsersService.findCustomerById.mockResolvedValueOnce(expectedCustomer)

      const result = await adminCustomersController.findOne('user-1')

      expect(mockUsersService.findCustomerById).toHaveBeenCalledWith('user-1')
      expect(result).toBe(expectedCustomer)
    })
  })
})

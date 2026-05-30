import { ConflictException, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AdminCategoriesController } from './admin-categories.controller'
import { CategoriesService } from './categories.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockCategoriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) }
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) }

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/categories')
  await $allureSubSuite('admin-categories.controller')
  await $allureSeverity('normal')
})

describe('AdminCategoriesController', () => {
  let adminCategoriesController: AdminCategoriesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile()

    adminCategoriesController = module.get<AdminCategoriesController>(AdminCategoriesController)
  })

  afterEach(() => jest.clearAllMocks())

  describe('findAll', () => {
    it('returns all categories with product count', async () => {
      const categoriesWithCount = [
        { id: 'cat-1', name: 'Bracelets', slug: 'bracelets', _count: { products: 3 } },
      ]
      mockCategoriesService.findAll.mockResolvedValue(categoriesWithCount)

      const result = await adminCategoriesController.findAll()

      expect(result).toEqual(categoriesWithCount)
      expect(mockCategoriesService.findAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('findOne', () => {
    it('returns category by id', async () => {
      const braceletCategory = { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' }
      mockCategoriesService.findOne.mockResolvedValue(braceletCategory)

      const result = await adminCategoriesController.findOne('cat-1')

      expect(result).toEqual(braceletCategory)
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith('cat-1')
    })

    it('propagates NotFoundException from service', async () => {
      mockCategoriesService.findOne.mockRejectedValue(new NotFoundException())

      await expect(adminCategoriesController.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('create', () => {
    it('creates and returns new category', async () => {
      const createdCategory = { id: 'cat-3', name: 'Earrings', slug: 'earrings' }
      mockCategoriesService.create.mockResolvedValue(createdCategory)

      const result = await adminCategoriesController.create({ name: 'Earrings' })

      expect(result).toEqual(createdCategory)
      expect(mockCategoriesService.create).toHaveBeenCalledWith({ name: 'Earrings' })
    })

    it('propagates ConflictException when slug is taken', async () => {
      mockCategoriesService.create.mockRejectedValue(new ConflictException())

      await expect(adminCategoriesController.create({ name: 'Rings' })).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('update', () => {
    it('updates and returns the modified category', async () => {
      const updatedCategory = { id: 'cat-1', name: 'Gold Rings', slug: 'gold-rings' }
      mockCategoriesService.update.mockResolvedValue(updatedCategory)

      const result = await adminCategoriesController.update('cat-1', { name: 'Gold Rings' })

      expect(result).toEqual(updatedCategory)
      expect(mockCategoriesService.update).toHaveBeenCalledWith('cat-1', { name: 'Gold Rings' })
    })
  })

  describe('remove', () => {
    it('delegates delete to service', async () => {
      mockCategoriesService.remove.mockResolvedValue(undefined)

      await adminCategoriesController.remove('cat-2')

      expect(mockCategoriesService.remove).toHaveBeenCalledWith('cat-2')
    })

    it('propagates ConflictException when category has products', async () => {
      mockCategoriesService.remove.mockRejectedValue(new ConflictException())

      await expect(adminCategoriesController.remove('cat-1')).rejects.toThrow(ConflictException)
    })
  })
})

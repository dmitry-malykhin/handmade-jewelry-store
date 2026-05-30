import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockCategories = [
  { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' },
  { id: 'cat-2', name: 'Necklaces', slug: 'necklaces' },
]

const mockCategoriesService = {
  findAll: jest.fn().mockResolvedValue(mockCategories),
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/categories')
  await $allureSubSuite('categories.controller')
  await $allureSeverity('normal')
})

describe('CategoriesController', () => {
  let categoriesController: CategoriesController

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockCategoriesService }],
    }).compile()

    categoriesController = testingModule.get<CategoriesController>(CategoriesController)
  })

  describe('findAll', () => {
    it('delegates to CategoriesService.findAll and returns the result', async () => {
      const result = await categoriesController.findAll()

      expect(mockCategoriesService.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockCategories)
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'

const mockCategories = [
  { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' },
  { id: 'cat-2', name: 'Necklaces', slug: 'necklaces' },
]

const mockCategoriesService = {
  findAll: jest.fn().mockResolvedValue(mockCategories),
}

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

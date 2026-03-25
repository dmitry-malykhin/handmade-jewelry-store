import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesService } from './categories.service'
import { PrismaService } from '../prisma/prisma.service'

const mockCategories = [
  { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' },
  { id: 'cat-2', name: 'Necklaces', slug: 'necklaces' },
]

class MockPrismaService {
  category = {
    findMany: jest.fn().mockResolvedValue(mockCategories),
  }
}

describe('CategoriesService', () => {
  let categoriesService: CategoriesService
  let prismaService: MockPrismaService

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useClass: MockPrismaService }],
    }).compile()

    categoriesService = testingModule.get<CategoriesService>(CategoriesService)
    prismaService = testingModule.get(PrismaService)
  })

  describe('findAll', () => {
    it('returns all categories ordered by name', async () => {
      const result = await categoriesService.findAll()

      expect(result).toEqual(mockCategories)
      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })
    })

    it('returns empty array when no categories exist', async () => {
      prismaService.category.findMany.mockResolvedValueOnce([])

      const result = await categoriesService.findAll()

      expect(result).toEqual([])
    })
  })
})

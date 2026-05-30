import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { CategoriesService } from './categories.service'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const mockPrismaService = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/categories')
  await $allureSubSuite('categories.service')
  await $allureSeverity('normal')
})

describe('CategoriesService', () => {
  let categoriesService: CategoriesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile()

    categoriesService = module.get<CategoriesService>(CategoriesService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('findAll', () => {
    it('returns all categories with product count ordered by name', async () => {
      const categoriesWithCount = [
        { id: 'cat-1', name: 'Bracelets', slug: 'bracelets', _count: { products: 3 } },
        { id: 'cat-2', name: 'Necklaces', slug: 'necklaces', _count: { products: 0 } },
      ]
      mockPrismaService.category.findMany.mockResolvedValue(categoriesWithCount)

      const result = await categoriesService.findAll()

      expect(result).toEqual(categoriesWithCount)
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      })
    })

    it('returns empty array when no categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([])

      const result = await categoriesService.findAll()

      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('returns category by id', async () => {
      const braceletCategory = { id: 'cat-1', name: 'Bracelets', slug: 'bracelets' }
      mockPrismaService.category.findUnique.mockResolvedValue(braceletCategory)

      const result = await categoriesService.findOne('cat-1')

      expect(result).toEqual(braceletCategory)
    })

    it('throws NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null)

      await expect(categoriesService.findOne('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates category with auto-generated slug from name', async () => {
      const createdCategory = { id: 'cat-3', name: 'Sterling Silver', slug: 'sterling-silver' }
      mockPrismaService.category.findUnique.mockResolvedValue(null)
      mockPrismaService.category.create.mockResolvedValue(createdCategory)

      const result = await categoriesService.create({ name: 'Sterling Silver' })

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: { name: 'Sterling Silver', slug: 'sterling-silver' },
        select: { id: true, name: true, slug: true },
      })
      expect(result).toEqual(createdCategory)
    })

    it('creates category with explicitly provided slug', async () => {
      const createdCategory = { id: 'cat-4', name: 'Rings', slug: 'custom-rings' }
      mockPrismaService.category.findUnique.mockResolvedValue(null)
      mockPrismaService.category.create.mockResolvedValue(createdCategory)

      await categoriesService.create({ name: 'Rings', slug: 'custom-rings' })

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: { name: 'Rings', slug: 'custom-rings' },
        select: { id: true, name: true, slug: true },
      })
    })

    it('throws ConflictException when slug already exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'existing', slug: 'rings' })

      await expect(categoriesService.create({ name: 'Rings' })).rejects.toThrow(ConflictException)
    })

    it('strips special characters when generating slug', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null)
      mockPrismaService.category.create.mockResolvedValue({
        id: 'cat-5',
        name: 'Gold & Silver',
        slug: 'gold-silver',
      })

      await categoriesService.create({ name: 'Gold & Silver' })

      expect(mockPrismaService.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'gold-silver' }) }),
      )
    })
  })

  describe('update', () => {
    it('updates name and auto-regenerates slug', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bracelets',
        slug: 'bracelets',
      })
      mockPrismaService.category.findFirst.mockResolvedValue(null)
      mockPrismaService.category.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Gold Bracelets',
        slug: 'gold-bracelets',
      })

      const result = await categoriesService.update('cat-1', { name: 'Gold Bracelets' })

      expect(result).toEqual({ id: 'cat-1', name: 'Gold Bracelets', slug: 'gold-bracelets' })
    })

    it('updates slug explicitly without auto-regenerating from name', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bracelets',
        slug: 'bracelets',
      })
      mockPrismaService.category.findFirst.mockResolvedValue(null)
      mockPrismaService.category.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Bracelets',
        slug: 'custom-slug',
      })

      await categoriesService.update('cat-1', { slug: 'custom-slug' })

      expect(mockPrismaService.category.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { slug: 'custom-slug' } }),
      )
    })

    it('throws NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null)

      await expect(categoriesService.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws ConflictException when new slug is taken by another category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bracelets',
        slug: 'bracelets',
      })
      mockPrismaService.category.findFirst.mockResolvedValue({ id: 'cat-2', slug: 'earrings' })

      await expect(categoriesService.update('cat-1', { slug: 'earrings' })).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('remove', () => {
    it('deletes category when it has no products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-2',
        name: 'Necklaces',
        slug: 'necklaces',
        _count: { products: 0 },
      })
      mockPrismaService.category.delete.mockResolvedValue(undefined)

      await categoriesService.remove('cat-2')

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-2' } })
    })

    it('throws NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null)

      await expect(categoriesService.remove('nonexistent')).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when category has linked products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Bracelets',
        slug: 'bracelets',
        _count: { products: 5 },
      })

      await expect(categoriesService.remove('cat-1')).rejects.toThrow(ConflictException)
    })
  })
})

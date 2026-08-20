import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(categoryId: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true, description: true },
    })

    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`)
    }

    return category
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const slug = createCategoryDto.slug ?? generateSlug(createCategoryDto.name)

    const existingCategory = await this.prismaService.category.findUnique({
      where: { slug },
    })

    if (existingCategory) {
      throw new ConflictException(`Category with slug "${slug}" already exists`)
    }

    return this.prismaService.category.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description ?? null,
      },
      select: { id: true, name: true, slug: true, description: true },
    })
  }

  async update(categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(categoryId)

    if (updateCategoryDto.slug) {
      const duplicateSlugCategory = await this.prismaService.category.findFirst({
        where: { slug: updateCategoryDto.slug, NOT: { id: categoryId } },
      })

      if (duplicateSlugCategory) {
        throw new ConflictException(`Category with slug "${updateCategoryDto.slug}" already exists`)
      }
    }

    const slugToSet =
      updateCategoryDto.slug ??
      (updateCategoryDto.name !== undefined ? generateSlug(updateCategoryDto.name) : undefined)

    return this.prismaService.category.update({
      where: { id: categoryId },
      data: {
        ...(updateCategoryDto.name !== undefined && { name: updateCategoryDto.name }),
        ...(slugToSet !== undefined && { slug: slugToSet }),
        ...(updateCategoryDto.description !== undefined && {
          description: updateCategoryDto.description || null,
        }),
      },
      select: { id: true, name: true, slug: true, description: true },
    })
  }

  async remove(categoryId: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`)
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it contains ${category._count.products} product(s). Move or delete the products first.`,
      )
    }

    await this.prismaService.category.delete({ where: { id: categoryId } })
  }
}

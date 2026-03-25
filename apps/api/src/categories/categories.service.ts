import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })
  }
}

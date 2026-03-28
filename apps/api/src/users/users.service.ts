import { Injectable } from '@nestjs/common'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

const BCRYPT_SALT_ROUNDS = 12

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } })
  }

  async findById(userId: string) {
    return this.prismaService.user.findUnique({ where: { id: userId } })
  }

  async createUser(email: string, plainPassword: string) {
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS)
    return this.prismaService.user.create({
      data: { email, password: hashedPassword, role: Role.USER },
    })
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }
}
